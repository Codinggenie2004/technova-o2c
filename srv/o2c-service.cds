using { technova.o2c as db } from '../db/schema';

// ─── Custom Types ───────────────────────────────────────────────────────────

type OrderItem {
    productId   : String(20);
    productName : String(100);
    quantity    : Integer;
    unitPrice   : Decimal(15,2);
}

// ─── Main O2C Service ────────────────────────────────────────────────────────

service O2CService @(path: '/api/o2c') {

    // ─── Customer APIs ─────────────────────────────────────────────────
    @readonly
    entity Customers as projection on db.Customers {
        *,
        salesOrders,
        creditStatus,
        creditLimit,
        currentBalance
    };

    // ─── Sales Order APIs ──────────────────────────────────────────────
    entity SalesOrders as projection on db.SalesOrders {
        *,
        customer.customerName as customerName,
        customer.creditLimit  as customerCreditLimit,
        items,
        payments
    };

    entity SalesOrderItems as projection on db.SalesOrderItems;

    // ─── Credit Block APIs ─────────────────────────────────────────────
    entity CreditBlockLog as projection on db.CreditBlockLog {
        *,
        customer.customerName   as customerName,
        salesOrder.salesOrderId as salesOrderNumber
    };

    // ─── Payment / Dunning APIs ────────────────────────────────────────
    entity Payments as projection on db.Payments {
        *,
        customer.customerName   as customerName,
        salesOrder.salesOrderId as salesOrderNumber
    };

    // ─── Notification Log ──────────────────────────────────────────────
    @readonly
    entity NotificationLog as projection on db.NotificationLog;

    // ─── Actions ──────────────────────────────────────────────────────

    // Submit a sales order (checks credit limit)
    action submitSalesOrder(
        customerId  : String,
        orderValue  : Decimal
    ) returns {
        salesOrderId  : String;
        status        : String;
        creditBlocked : Boolean;
        message       : String;
    };

    // Approve a credit block
    action approveCreditBlock(
        creditBlockId  : UUID,
        managerComment : String
    ) returns {
        success : Boolean;
        message : String;
    };

    // Reject a credit block
    action rejectCreditBlock(
        creditBlockId  : UUID,
        managerComment : String
    ) returns {
        success : Boolean;
        message : String;
    };

    // Trigger dunning for overdue payments
    action processDunning() returns {
        processed : Integer;
        message   : String;
    };
}

// ─── Admin Service ──────────────────────────────────────────────────────────
@requires: 'authenticated-user'
service AdminService @(path: '/api/admin') {
    entity Customers      as projection on db.Customers;
    entity Payments       as projection on db.Payments;
    entity CreditBlockLog as projection on db.CreditBlockLog;
    entity NotificationLog as projection on db.NotificationLog;
}
