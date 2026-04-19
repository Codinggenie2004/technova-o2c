# InnovaCorp O2C — SAP BTP Project

<div align="center">

![SAP BTP](https://img.shields.io/badge/SAP%20BTP-0070F2?style=for-the-badge&logo=sap&logoColor=white)
![CAP](https://img.shields.io/badge/SAP%20CAP-0070F2?style=for-the-badge&logo=sap&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

**End-to-End Order-to-Cash (O2C) Process Automation for InnovaCorp Solutions Pvt. Ltd.**

</div>

---

## 📋 Project Overview

This project implements the **Order-to-Cash (O2C)** business process for InnovaCorp Solutions using **SAP Business Technology Platform (BTP)**. It covers:

- 🔒 **Credit Block Release Workflow** — Automated approval when sales orders exceed credit limits
- 📦 **Sales Order Management** — Create and track sales orders with real-time credit checks
- 📬 **Dunning Escalation** — Automated overdue payment reminders (3-level escalation)
- 📊 **O2C Analytics Dashboard** — KPI monitoring via SAP Analytics Cloud

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  SAP BTP (ap21 - India)              │
│                                                      │
│  ┌──────────────┐    ┌───────────────────────────┐  │
│  │  CAP Backend │    │  SAP Build Process Auto.  │  │
│  │  (Node.js)   │    │  Credit Block Workflow     │  │
│  │              │    │  v1.0.3 Deployed & Active  │  │
│  │  /api/o2c    │    └───────────────────────────┘  │
│  │  /api/admin  │                                    │
│  └──────────────┘    ┌───────────────────────────┐  │
│         │            │   SAP HANA Cloud (DB)      │  │
│         └────────────►   (Production)             │  │
│                      └───────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
InnovaCorp-o2c/
├── db/
│   ├── schema.cds              ← Data models (Customers, Orders, Payments)
│   └── data/
│       ├── InnovaCorp.o2c-Customers.csv
│       ├── InnovaCorp.o2c-SalesOrders.csv
│       ├── InnovaCorp.o2c-CreditBlockLog.csv
│       └── InnovaCorp.o2c-Payments.csv
├── srv/
│   ├── o2c-service.cds         ← Service definitions & OData APIs
│   └── o2c-service.js          ← Business logic (credit check, dunning)
├── app/                        ← SAP Fiori UI (upcoming)
├── sbpa/                       ← SAP Build Process Automation exports
├── mta.yaml                    ← BTP deployment configuration
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- `@sap/cds-dk` installed globally
- SAP BTP Trial account

### Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/InnovaCorp-o2c.git
cd InnovaCorp-o2c

# Install dependencies
npm install

# Start local server
cds watch
```

Server runs at: **http://localhost:4004**

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/o2c/Customers` | List all customers with credit info |
| `GET` | `/api/o2c/SalesOrders` | List all sales orders |
| `GET` | `/api/o2c/CreditBlockLog` | View credit block history |
| `GET` | `/api/o2c/Payments` | View invoices & dunning status |
| `POST` | `/api/o2c/submitSalesOrder` | Create new order (with credit check) |
| `POST` | `/api/o2c/approveCreditBlock` | Approve blocked order |
| `POST` | `/api/o2c/rejectCreditBlock` | Reject blocked order |
| `POST` | `/api/o2c/processDunning` | Run dunning for overdue invoices |

---

## 📊 Data Model

```
Customers ──────────── SalesOrders ──────────── SalesOrderItems
    │                       │
    │                  CreditBlockLog
    │                       
    └───────────────── Payments (Dunning)
                            │
                       NotificationLog
```

---

## 🔧 Key Features

### ✅ Credit Limit Check
When a sales order is submitted, the system automatically:
1. Checks customer's available credit (`creditLimit - currentBalance`)
2. If exceeded → creates a `CREDIT_BLOCKED` order + logs to `CreditBlockLog`
3. Triggers SAP Build Process Automation workflow for Credit Manager approval

### ✅ Dunning Escalation (3-Level)
| Days Overdue | Dunning Level | Action |
|---|---|---|
| 7+ days | Level 1 | Payment reminder |
| 15+ days | Level 2 | Warning notice |
| 30+ days | Level 3 | Final notice / escalation |

### ✅ SAP Build Process Automation
The **Credit Block Release** workflow (v1.0.3) is deployed and active on SAP BTP:
- Trigger: Form submission with order details
- Approval: Credit Manager reviews and approves/rejects
- Outcome: Order released or cancelled

---

## 🌐 SAP BTP Deployment

```bash
# Build the MTA archive
mbt build

# Login to Cloud Foundry
cf login -a https://api.cf.ap21.hana.ondemand.com

# Deploy
cf deploy mta_archives/InnovaCorp-o2c_1.0.0.mtar
```

---

## 👨‍💻 Developer

**Saket Suman**  
Roll No: 23052419  
KIIT University  
SAP BTP Trial: `dedb24a4trial`

---

## 📄 License

This project is for academic purposes — InnovaCorp Solutions O2C Implementation.
