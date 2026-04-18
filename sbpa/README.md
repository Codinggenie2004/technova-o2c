# SAP Build Process Automation — Exported Workflows

This folder contains the exported process definitions from **SAP Build Process Automation** (version 1.0.3, Deployed & Active).

## Deployed Processes

### 1. Credit Block Release Workflow
- **Version**: 1.0.3
- **Status**: Deployed & Active
- **Environment**: Public (SAP BTP Trial - ap21)
- **Tenant**: dedb24a4trial

#### Process Flow:
```
[Credit Block Request Form] ← Trigger (Form Submission)
         ↓
[Credit Manager Approval]  ← Approval Task (My Inbox)
    ↙           ↘
[Approve]     [Reject]
    ↘           ↙
        [End]
```

#### Trigger Inputs:
| Field | Type | Description |
|---|---|---|
| `salesOrderNumber` | String | Sales Order ID (e.g. SO-TN-240004) |
| `customerName` | String | Customer display name |
| `orderValue` | Decimal | Total order value in INR |
| `creditLimit` | Decimal | Customer credit limit in INR |
| `exceededBy` | Decimal | Amount exceeding credit limit |

#### Artifacts:
- `Credit Block Release` — Main process
- `Credit Manager Approval` — Approval form with read-only order details + manager comments

## How to Re-Import

1. Go to [SAP Build Process Automation](https://ap21.build.cloud.sap)
2. Create a new project → Import
3. Upload the exported `.mtar` file (if available)

## Screenshots
See `/docs/screenshots/` for deployment evidence.
