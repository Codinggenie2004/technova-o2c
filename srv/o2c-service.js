const cds = require('@sap/cds');

module.exports = class O2CService extends cds.ApplicationService {

    async init() {

        const { SalesOrders, Customers, CreditBlockLog, Payments } = this.entities;

        // ─── Submit Sales Order ────────────────────────────────────────────
        this.on('submitSalesOrder', async (req) => {
            const { customerId, orderValue, items } = req.data;
            const db = await cds.connect.to('db');

            // 1. Get customer details
            const customer = await db.run(
                SELECT.one.from(Customers).where({ customerId })
            );

            if (!customer) {
                return req.error(404, `Customer ${customerId} not found`);
            }

            // 2. Credit limit check
            const availableCredit = customer.creditLimit - customer.currentBalance;
            const creditBlocked   = orderValue > availableCredit;
            const exceededBy      = creditBlocked ? (orderValue - availableCredit) : 0;

            // 3. Generate order ID
            const salesOrderId = `SO-TN-${Date.now().toString().slice(-6)}`;
            const orderDate    = new Date().toISOString().split('T')[0];

            // 4. Create sales order
            const orderStatus = creditBlocked ? 'CREDIT_BLOCKED' : 'CONFIRMED';

            await db.run(INSERT.into(SalesOrders).entries({
                salesOrderId,
                customer_ID   : customer.ID,
                orderDate,
                orderValue,
                currency      : 'INR',
                status        : orderStatus,
                creditBlocked,
                exceededBy,
                items: items.map((item, idx) => ({
                    itemNumber  : idx + 1,
                    productId   : item.productId,
                    productName : item.productName,
                    quantity    : item.quantity,
                    unitPrice   : item.unitPrice,
                    totalPrice  : item.quantity * item.unitPrice
                }))
            }));

            // 5. If credit blocked, log it
            if (creditBlocked) {
                const order = await db.run(
                    SELECT.one.from(SalesOrders).where({ salesOrderId })
                );

                await db.run(INSERT.into(CreditBlockLog).entries({
                    salesOrder_ID : order.ID,
                    customer_ID   : customer.ID,
                    orderValue,
                    creditLimit   : customer.creditLimit,
                    exceededBy,
                    blockedAt     : new Date(),
                    status        : 'PENDING'
                }));

                console.log(`⚠️  Credit Block triggered for order ${salesOrderId} - Exceeded by INR ${exceededBy}`);
            } else {
                // Update customer balance
                await db.run(
                    UPDATE(Customers)
                        .set({ currentBalance: customer.currentBalance + orderValue })
                        .where({ ID: customer.ID })
                );
                console.log(`✅  Sales Order ${salesOrderId} confirmed for ${customer.customerName}`);
            }

            return {
                salesOrderId,
                status        : orderStatus,
                creditBlocked,
                message       : creditBlocked
                    ? `Order ${salesOrderId} is CREDIT BLOCKED. Exceeds limit by INR ${exceededBy.toLocaleString('en-IN')}`
                    : `Order ${salesOrderId} confirmed successfully!`
            };
        });

        // ─── Approve Credit Block ──────────────────────────────────────────
        this.on('approveCreditBlock', async (req) => {
            const { creditBlockId, managerComment } = req.data;
            const db = await cds.connect.to('db');

            const block = await db.run(
                SELECT.one.from(CreditBlockLog).where({ ID: creditBlockId })
            );

            if (!block) return req.error(404, 'Credit block record not found');
            if (block.status !== 'PENDING') return req.error(400, 'Already processed');

            // Update credit block status
            await db.run(
                UPDATE(CreditBlockLog)
                    .set({
                        status        : 'APPROVED',
                        managerComment,
                        reviewedAt    : new Date()
                    })
                    .where({ ID: creditBlockId })
            );

            // Release the sales order
            await db.run(
                UPDATE(SalesOrders)
                    .set({ status: 'CONFIRMED', creditBlocked: false })
                    .where({ ID: block.salesOrder_ID })
            );

            // Update customer balance
            await db.run(
                UPDATE(Customers)
                    .set({ currentBalance: cds.ql`currentBalance + ${block.orderValue}` })
                    .where({ ID: block.customer_ID })
            );

            console.log(`✅  Credit block APPROVED for order - Manager: ${managerComment}`);
            return { success: true, message: 'Credit block approved and order released' };
        });

        // ─── Reject Credit Block ───────────────────────────────────────────
        this.on('rejectCreditBlock', async (req) => {
            const { creditBlockId, managerComment } = req.data;
            const db = await cds.connect.to('db');

            await db.run(
                UPDATE(CreditBlockLog)
                    .set({ status: 'REJECTED', managerComment, reviewedAt: new Date() })
                    .where({ ID: creditBlockId })
            );

            await db.run(
                UPDATE(SalesOrders)
                    .set({ status: 'CANCELLED' })
                    .where({ ID: (SELECT('salesOrder_ID').from(CreditBlockLog).where({ ID: creditBlockId })) })
            );

            console.log(`❌  Credit block REJECTED - Reason: ${managerComment}`);
            return { success: true, message: 'Credit block rejected and order cancelled' };
        });

        // ─── Process Dunning ───────────────────────────────────────────────
        this.on('processDunning', async (req) => {
            const db   = await cds.connect.to('db');
            const today = new Date();
            let processed = 0;

            const overduePayments = await db.run(
                SELECT.from(Payments).where({ paymentStatus: 'OPEN' })
            );

            for (const payment of overduePayments) {
                const due      = new Date(payment.dueDate);
                const daysOver = Math.floor((today - due) / (1000 * 60 * 60 * 24));

                if (daysOver > 0) {
                    let dunningLevel = 0;
                    let paymentStatus = 'OVERDUE';

                    if (daysOver >= 30)      dunningLevel = 3;
                    else if (daysOver >= 15) dunningLevel = 2;
                    else if (daysOver >= 7)  dunningLevel = 1;

                    await db.run(
                        UPDATE(Payments)
                            .set({ daysOverdue: daysOver, dunningLevel, paymentStatus })
                            .where({ ID: payment.ID })
                    );

                    console.log(`📬 Dunning Level ${dunningLevel} triggered for invoice ${payment.invoiceNumber} - ${daysOver} days overdue`);
                    processed++;
                }
            }

            return { processed, message: `Dunning processed for ${processed} overdue payment(s)` };
        });

        await super.init();
    }
};
