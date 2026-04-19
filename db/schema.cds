namespace InnovaCorp.o2c;

using { cuid, managed, Currency } from '@sap/cds/common';

// ─── Customers ──────────────────────────────────────────────────────────────

entity Customers : cuid, managed {
    customerId     : String(10);
    customerName   : String(100);
    email          : String(100);
    phone          : String(20);
    address        : String(200);
    city           : String(50);
    country        : String(50);
    creditLimit    : Decimal(15,2);
    currentBalance : Decimal(15,2) default 0;
    creditStatus   : String(20) default 'ACTIVE'; // ACTIVE, BLOCKED, ON_HOLD
    salesOrders    : Association to many SalesOrders on salesOrders.customer = $self;
}

// ─── Sales Orders ───────────────────────────────────────────────────────────

entity SalesOrders : cuid, managed {
    salesOrderId   : String(20);
    customer       : Association to Customers;
    orderDate      : Date;
    deliveryDate   : Date;
    orderValue     : Decimal(15,2);
    currency       : String(3) default 'INR';
    status         : String(20) default 'PENDING';
    // PENDING, CONFIRMED, CREDIT_BLOCKED, SHIPPED, DELIVERED, CANCELLED
    creditBlocked  : Boolean default false;
    exceededBy     : Decimal(15,2) default 0;
    items          : Composition of many SalesOrderItems on items.salesOrder = $self;
    payments       : Association to many Payments on payments.salesOrder = $self;
}

// ─── Sales Order Items ──────────────────────────────────────────────────────

entity SalesOrderItems : cuid {
    salesOrder     : Association to SalesOrders;
    itemNumber     : Integer;
    productId      : String(20);
    productName    : String(100);
    quantity       : Integer;
    unitPrice      : Decimal(15,2);
    totalPrice     : Decimal(15,2);
    unit           : String(10) default 'EA';
}

// ─── Credit Block Log ───────────────────────────────────────────────────────

entity CreditBlockLog : cuid, managed {
    salesOrder     : Association to SalesOrders;
    customer       : Association to Customers;
    orderValue     : Decimal(15,2);
    creditLimit    : Decimal(15,2);
    exceededBy     : Decimal(15,2);
    blockedAt      : Timestamp;
    status         : String(20) default 'PENDING';
    // PENDING, APPROVED, REJECTED
    reviewedBy     : String(100);
    reviewedAt     : Timestamp;
    managerComment : String(500);
    processInstanceId : String(100); // SAP SBPA instance reference
}

// ─── Payments / Dunning ─────────────────────────────────────────────────────

entity Payments : cuid, managed {
    salesOrder     : Association to SalesOrders;
    customer       : Association to Customers;
    invoiceNumber  : String(20);
    invoiceDate    : Date;
    dueDate        : Date;
    invoiceAmount  : Decimal(15,2);
    paidAmount     : Decimal(15,2) default 0;
    outstandingAmt : Decimal(15,2);
    currency       : String(3) default 'INR';
    paymentStatus  : String(20) default 'OPEN';
    // OPEN, PARTIAL, PAID, OVERDUE
    dunningLevel   : Integer default 0; // 0=none, 1=reminder, 2=warning, 3=final
    dunningDate    : Date;
    daysOverdue    : Integer default 0;
}

// ─── Notifications Log ──────────────────────────────────────────────────────

entity NotificationLog : cuid, managed {
    notificationType : String(50);
    // ORDER_CONFIRMATION, CREDIT_BLOCK, DUNNING_L1, DUNNING_L2, DUNNING_L3
    recipient      : String(100);
    subject        : String(200);
    sentAt         : Timestamp;
    status         : String(20) default 'SENT'; // SENT, FAILED, PENDING
    referenceId    : String(50); // salesOrderId or invoiceNumber
}
