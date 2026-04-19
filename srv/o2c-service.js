const cds = require('@sap/cds');
const NotificationService = require('./notification-service');

module.exports = class O2CService extends cds.ApplicationService {

    async init() {
        const { SalesOrders, Customers, CreditBlockLog, Payments } = this.entities;

        // ─── Submit Sales Order (with Credit Check + Notification + SBPA) ──────
        this.on('submitSalesOrder', async (req) => {
            const { customerId, orderValue } = req.data;
            const db = await cds.connect.to('db');

            // 1. Get customer
            const customer = await db.run(
                SELECT.one.from(Customers).where({ customerId })
            );
            if (!customer) return req.error(404, `Customer ${customerId} not found`);

            // 2. Credit check
            const availableCredit = customer.creditLimit - customer.currentBalance;
            const creditBlocked   = orderValue > availableCredit;
            const exceededBy      = creditBlocked ? (orderValue - availableCredit) : 0;

            // 3. Create sales order
            const salesOrderId = `SO-TN-${Date.now().toString().slice(-6)}`;
            const orderDate    = new Date().toISOString().split('T')[0];
            const orderStatus  = creditBlocked ? 'CREDIT_BLOCKED' : 'CONFIRMED';

            await db.run(INSERT.into(SalesOrders).entries({
                salesOrderId,
                customer_ID  : customer.ID,
                orderDate,
                orderValue,
                currency     : 'INR',
                status       : orderStatus,
                creditBlocked,
                exceededBy
            }));

            const order = await db.run(SELECT.one.from(SalesOrders).where({ salesOrderId }));

            if (creditBlocked) {
                // 4a. Log credit block
                await db.run(INSERT.into(CreditBlockLog).entries({
                    salesOrder_ID : order.ID,
                    customer_ID   : customer.ID,
                    orderValue,
                    creditLimit   : customer.creditLimit,
                    exceededBy,
                    blockedAt     : new Date(),
                    status        : 'PENDING'
                }));

                // 4b. Trigger SBPA workflow (async, non-blocking)
                this._triggerSBPAWorkflow({
                    salesOrderNumber : salesOrderId,
                    customerName     : customer.customerName,
                    orderValue,
                    creditLimit      : customer.creditLimit,
                    exceededBy
                }).catch(e => console.warn('SBPA trigger failed (non-blocking):', e.message));

                // 4c. Send credit block email to manager
                await NotificationService.sendCreditBlockAlert({
                    salesOrderId,
                    customerName : customer.customerName,
                    orderValue,
                    creditLimit  : customer.creditLimit,
                    exceededBy
                });

                console.log(`⚠️  CREDIT BLOCKED: ${salesOrderId} — ${customer.customerName} exceeded by ₹${exceededBy.toLocaleString('en-IN')}`);
            } else {
                // 4a. Update customer balance
                await db.run(
                    UPDATE(Customers)
                        .set({ currentBalance: customer.currentBalance + orderValue })
                        .where({ ID: customer.ID })
                );

                // 4b. Send order confirmation email
                await NotificationService.sendOrderConfirmation({
                    salesOrderId,
                    customerName : customer.customerName,
                    orderValue,
                    deliveryDate : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                });

                console.log(`✅  CONFIRMED: ${salesOrderId} — ${customer.customerName} — ₹${orderValue.toLocaleString('en-IN')}`);
            }

            return {
                salesOrderId,
                status        : orderStatus,
                creditBlocked,
                message       : creditBlocked
                    ? `Order ${salesOrderId} CREDIT BLOCKED. Exceeded limit by ₹${exceededBy.toLocaleString('en-IN')}. Manager notified.`
                    : `Order ${salesOrderId} confirmed! Confirmation email sent.`
            };
        });

        // ─── Approve Credit Block ──────────────────────────────────────────────
        this.on('approveCreditBlock', async (req) => {
            const { creditBlockId, managerComment } = req.data;
            const db = await cds.connect.to('db');

            const block = await db.run(SELECT.one.from(CreditBlockLog).where({ ID: creditBlockId }));
            if (!block) return req.error(404, 'Credit block record not found');
            if (block.status !== 'PENDING') return req.error(400, `Already ${block.status}`);

            // Update block status
            await db.run(UPDATE(CreditBlockLog)
                .set({ status: 'APPROVED', managerComment, reviewedAt: new Date() })
                .where({ ID: creditBlockId }));

            // Release order
            await db.run(UPDATE(SalesOrders)
                .set({ status: 'CONFIRMED', creditBlocked: false })
                .where({ ID: block.salesOrder_ID }));

            // Update customer balance
            await db.run(UPDATE(Customers)
                .set({ currentBalance: cds.ql`currentBalance + ${block.orderValue}` })
                .where({ ID: block.customer_ID }));

            console.log(`✅  APPROVED: ${creditBlockId} — ₹${block.orderValue?.toLocaleString('en-IN')} — ${managerComment}`);
            return { success: true, message: 'Credit block approved. Order released and customer balance updated.' };
        });

        // ─── Reject Credit Block ───────────────────────────────────────────────
        this.on('rejectCreditBlock', async (req) => {
            const { creditBlockId, managerComment } = req.data;
            const db = await cds.connect.to('db');

            const block = await db.run(SELECT.one.from(CreditBlockLog).where({ ID: creditBlockId }));
            if (!block) return req.error(404, 'Credit block record not found');
            if (block.status !== 'PENDING') return req.error(400, `Already ${block.status}`);

            await db.run(UPDATE(CreditBlockLog)
                .set({ status: 'REJECTED', managerComment, reviewedAt: new Date() })
                .where({ ID: creditBlockId }));

            await db.run(UPDATE(SalesOrders)
                .set({ status: 'CANCELLED' })
                .where({ ID: block.salesOrder_ID }));

            console.log(`❌  REJECTED: ${creditBlockId} — Reason: ${managerComment}`);
            return { success: true, message: 'Credit block rejected. Order cancelled.' };
        });

        // ─── Process Dunning ───────────────────────────────────────────────────
        this.on('processDunning', async (req) => {
            const db    = await cds.connect.to('db');
            const today = new Date();
            let processed = 0;

            const openPayments = await db.run(
                SELECT.from(Payments).where({ paymentStatus: { '!=': 'PAID' } })
            );

            for (const payment of openPayments) {
                const due      = new Date(payment.dueDate);
                const daysOver = Math.floor((today - due) / (1000 * 60 * 60 * 24));

                if (daysOver > 0) {
                    let dunningLevel = 0;
                    if (daysOver >= 30)      dunningLevel = 3;
                    else if (daysOver >= 15) dunningLevel = 2;
                    else if (daysOver >= 7)  dunningLevel = 1;

                    // Only escalate if dunning level increased
                    if (dunningLevel > (payment.dunningLevel || 0)) {
                        await db.run(UPDATE(Payments)
                            .set({ daysOverdue: daysOver, dunningLevel, paymentStatus: 'OVERDUE', dunningDate: today.toISOString().split('T')[0] })
                            .where({ ID: payment.ID }));

                        // Get customer name
                        let customerName = payment.customerName || 'Valued Customer';

                        // Send dunning email notification
                        await NotificationService.sendDunningNotice({
                            invoiceNumber  : payment.invoiceNumber,
                            customerName,
                            outstandingAmt : payment.outstandingAmt,
                            daysOverdue    : daysOver,
                            dunningLevel,
                            dueDate        : payment.dueDate
                        });

                        processed++;
                        console.log(`📬 Dunning L${dunningLevel} sent for ${payment.invoiceNumber} — ${daysOver} days overdue`);
                    }
                }
            }

            return { processed, message: `Dunning processed: ${processed} notification(s) sent` };
        });

        await super.init();
    }

    /**
     * Trigger SAP Build Process Automation Workflow
     * Called when an order is credit blocked
     */
    async _triggerSBPAWorkflow({ salesOrderNumber, customerName, orderValue, creditLimit, exceededBy }) {
        const SBPA_URL = process.env.SBPA_URL || 'https://dedb24a4trial.ap21.process-automation.build.cloud.sap';
        const token    = process.env.SBPA_TOKEN;

        if (!token) {
            console.log('📋 [SBPA MOCK] Would trigger workflow with:', {
                salesOrderNumber, customerName, orderValue, creditLimit, exceededBy
            });
            return { triggered: false, reason: 'SBPA_TOKEN not configured (mock mode)' };
        }

        const response = await fetch(`${SBPA_URL}/workflow/rest/v1/workflow-instances`, {
            method  : 'POST',
            headers : {
                'Content-Type'  : 'application/json',
                'Authorization' : `Bearer ${token}`
            },
            body: JSON.stringify({
                definitionId : 'innovacorpcreditblockrelease',
                context      : { salesOrderNumber, customerName, orderValue, creditLimit, exceededBy }
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`🚀 SBPA workflow triggered: ${data.id}`);
            return { triggered: true, instanceId: data.id };
        } else {
            console.warn(`⚠️  SBPA trigger failed: ${response.status}`);
            return { triggered: false, status: response.status };
        }
    }
};
