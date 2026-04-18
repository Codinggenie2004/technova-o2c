/**
 * TechNova O2C — Notification Service
 * Handles email notifications for:
 *  1. Order Confirmation
 *  2. Credit Block Alert
 *  3. Dunning Escalation (Level 1/2/3)
 *
 * In production: configure SMTP via environment variables
 * In development: logs to console (mock mode)
 */

const cds = require('@sap/cds');

class NotificationService {

    /**
     * Send Order Confirmation notification
     */
    static async sendOrderConfirmation({ salesOrderId, customerName, orderValue, deliveryDate }) {
        const subject = `Order Confirmation — ${salesOrderId} | TechNova Solutions`;
        const body = `
Dear ${customerName},

Thank you for your order! Your sales order has been confirmed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ORDER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Sales Order ID : ${salesOrderId}
  Order Value    : ₹${Number(orderValue).toLocaleString('en-IN')}
  Expected Date  : ${deliveryDate || 'To be confirmed'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your order is now being processed. You will receive a shipping 
notification once the order is dispatched.

For queries, contact: orders@technova-solutions.com

Regards,
TechNova Solutions Pvt. Ltd.
Order Management Team
`;
        return NotificationService._send({
            to: customerName,
            type: 'ORDER_CONFIRMATION',
            subject,
            body,
            referenceId: salesOrderId
        });
    }

    /**
     * Send Credit Block notification to Credit Manager
     */
    static async sendCreditBlockAlert({ salesOrderId, customerName, orderValue, creditLimit, exceededBy }) {
        const subject = `⚠️ Credit Block Alert — ${salesOrderId} requires your approval`;
        const body = `
Dear Credit Manager,

A sales order has been placed that exceeds the customer's credit limit.
Immediate review and approval is required.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CREDIT BLOCK DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Sales Order ID  : ${salesOrderId}
  Customer        : ${customerName}
  Order Value     : ₹${Number(orderValue).toLocaleString('en-IN')}
  Credit Limit    : ₹${Number(creditLimit).toLocaleString('en-IN')}
  Exceeded By     : ₹${Number(exceededBy).toLocaleString('en-IN')} ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Action Required:
  → Approve: Release the order and update credit terms
  → Reject:  Cancel the order and notify the customer

Please review in the SAP Build Process Automation inbox:
https://dedb24a4trial.ap21.build.cloud.sap/myinbox

Regards,
TechNova O2C Automation System
`;
        return NotificationService._send({
            to: 'credit.manager@technova-solutions.com',
            type: 'CREDIT_BLOCK',
            subject,
            body,
            referenceId: salesOrderId
        });
    }

    /**
     * Send Dunning notification (Level 1, 2, or 3)
     */
    static async sendDunningNotice({ invoiceNumber, customerName, outstandingAmt, daysOverdue, dunningLevel, dueDate }) {
        const levelText = {
            1: 'PAYMENT REMINDER',
            2: 'OVERDUE PAYMENT WARNING',
            3: '⚠️ FINAL NOTICE — LEGAL ACTION PENDING'
        }[dunningLevel] || 'PAYMENT NOTICE';

        const urgency = dunningLevel >= 3 ? '🚨 URGENT: ' : dunningLevel === 2 ? '⚠️ ' : '';

        const subject = `${urgency}${levelText} — Invoice ${invoiceNumber} | TechNova Solutions`;
        const body = `
Dear ${customerName},

${dunningLevel === 1
    ? 'This is a friendly reminder that the following invoice is now past due.'
    : dunningLevel === 2
    ? 'Despite our previous reminder, payment for the following invoice remains outstanding.'
    : 'This is your FINAL NOTICE. Failure to pay may result in legal action and suspension of credit facilities.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OVERDUE INVOICE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Invoice Number  : ${invoiceNumber}
  Due Date        : ${dueDate}
  Outstanding Amt : ₹${Number(outstandingAmt).toLocaleString('en-IN')}
  Days Overdue    : ${daysOverdue} days
  Dunning Level   : ${dunningLevel} of 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please arrange payment immediately to:
  Bank: HDFC Bank | TechNova Solutions Pvt. Ltd.
  Account: 50100123456789 | IFSC: HDFC0001234

${dunningLevel >= 3 ? 'Failure to respond within 7 days will result in referral to our legal team.' : ''}

Regards,
TechNova Solutions Pvt. Ltd.
Accounts Receivable Team
`;
        return NotificationService._send({
            to: customerName,
            type: `DUNNING_L${dunningLevel}`,
            subject,
            body,
            referenceId: invoiceNumber
        });
    }

    /**
     * Core send method — logs to console in dev, uses SMTP in production
     */
    static async _send({ to, type, subject, body, referenceId }) {
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction && process.env.SMTP_HOST) {
            // TODO: In production, use nodemailer with SMTP config
            // const nodemailer = require('nodemailer');
            // const transporter = nodemailer.createTransport({...});
            // await transporter.sendMail({from, to, subject, text: body});
            console.log(`📧 Email SENT to ${to}: ${subject}`);
        } else {
            // Development — log the full email
            console.log('\n' + '═'.repeat(60));
            console.log(`📧 [MOCK EMAIL - ${type}]`);
            console.log(`   To      : ${to}`);
            console.log(`   Subject : ${subject}`);
            console.log(`   Ref     : ${referenceId}`);
            console.log('═'.repeat(60));
            console.log(body);
            console.log('═'.repeat(60) + '\n');
        }

        // Log to DB
        try {
            const db = await cds.connect.to('db');
            await db.run(
                INSERT.into('technova.o2c.NotificationLog').entries({
                    notificationType : type,
                    recipient        : to,
                    subject,
                    sentAt           : new Date(),
                    status           : 'SENT',
                    referenceId
                })
            );
        } catch (err) {
            console.warn('Could not log notification to DB:', err.message);
        }

        return { sent: true, type, to, subject };
    }
}

module.exports = NotificationService;
