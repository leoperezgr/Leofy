
  # Leofy Fintech App Design
  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
  ## Quick sanity check: MSI in `transaction.metadata`

  Example `POST /api/transactions` payload:

  ```json
  {
    "type": "EXPENSE",
    "amount": 12000,
    "category": "Groceries",
    "card_id": "123",
    "occurred_at": "2026-02-27T12:00:00.000Z",
    "metadata": {
      "paymentMethod": "credit",
      "installments": {
        "months": 12
      }
    }
  }
  ```

  Expected persisted `metadata.installments`:
  - `months = 12`
  - `monthlyAmount = 1000`
  - `startAt = occurred_at` (ISO string) when not provided
  
