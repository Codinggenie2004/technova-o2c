using { innovacorp.o2c as db } from '../db/schema';

/**
 * Analytics Service — O2C KPI Aggregations
 * Provides computed views for SAP Analytics Cloud integration
 */
@path: '/api/analytics'
service AnalyticsService {

    // ─── Order KPIs ────────────────────────────────────────────────────────
    @readonly
    entity OrderKPIs as select from db.SalesOrders {
        key status,
        count(*) as orderCount : Integer,
        sum(orderValue)        as totalValue : Decimal(15,2),
        avg(orderValue)        as avgValue   : Decimal(15,2)
    } group by status;

    // ─── Credit Block Summary ───────────────────────────────────────────────
    @readonly
    entity CreditBlockSummary as select from db.CreditBlockLog {
        key status,
        count(*)          as blockCount   : Integer,
        sum(exceededBy)   as totalExceeded : Decimal(15,2),
        avg(exceededBy)   as avgExceeded   : Decimal(15,2)
    } group by status;

    // ─── Dunning Summary ────────────────────────────────────────────────────
    @readonly
    entity DunningSummary as select from db.Payments {
        key dunningLevel,
        key paymentStatus,
        count(*)              as count          : Integer,
        sum(outstandingAmt)   as totalOutstanding : Decimal(15,2)
    } group by dunningLevel, paymentStatus;

    // ─── Customer Risk View ─────────────────────────────────────────────────
    @readonly
    entity CustomerRisk as select from db.Customers {
        key customerId,
        customerName,
        city,
        creditLimit,
        currentBalance,
        creditStatus,
        (currentBalance / creditLimit * 100) as utilizationPct : Decimal(5,2),
        (creditLimit - currentBalance)        as availableCredit : Decimal(15,2)
    };

    // ─── Overdue AR Aging ───────────────────────────────────────────────────
    @readonly
    entity ARAgingReport as select from db.Payments {
        key invoiceNumber,
        customer.customerName as customerName,
        invoiceDate,
        dueDate,
        invoiceAmount,
        outstandingAmt,
        daysOverdue,
        dunningLevel,
        paymentStatus
    } where paymentStatus != 'PAID'
      order by daysOverdue desc;
}
