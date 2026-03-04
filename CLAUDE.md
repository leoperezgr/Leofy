# Leofy — Personal Finance App

## Overview

Leofy is a full-stack personal finance web app for tracking income, expenses, credit card billing cycles, transfers, and spending statistics. Built with React + Vite frontend and Node.js/Express + Prisma + PostgreSQL backend.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3, TypeScript, Vite 6, React Router 7 |
| Styling | Tailwind CSS 4, component CSS files, Shadcn/Radix UI, MUI |
| CSS-in-JS | Emotion (for MUI) |
| Charts | Recharts 2.15 |
| Icons | Lucide React 0.487 |
| Fonts | Inter (Google Fonts, 400-700) |
| Notifications | Sonner (toast notifications) |
| Backend | Express 5.2, Node.js |
| ORM | Prisma 7.4 with PostgreSQL adapter |
| Database | PostgreSQL (Aiven cloud), schema `leofy` |
| Auth | JWT (jsonwebtoken), bcrypt for passwords |
| Validation | Zod (backend input validation) |

---

## Project Structure

```
Leofy/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express app, route registration
│   │   ├── prisma.js              # Prisma client instance
│   │   ├── middleware/
│   │   │   ├── auth.js            # requireAuth — JWT verification
│   │   │   └── requireRole.js     # requireRole(...roles) — RBAC
│   │   └── routes/
│   │       ├── auth.routes.js     # Login, /me profile
│   │       ├── onboarding.routes.js
│   │       ├── transactions.routes.js  # CRUD transactions
│   │       ├── cards.routes.js    # CRUD credit/debit cards
│   │       ├── categories.routes.js    # Bulk category management
│   │       ├── stats.routes.js    # Dashboard statistics
│   │       ├── transfers.routes.js     # Card-to-card transfers
│   │       └── tester.routes.js   # Testing endpoints (TESTER/ADMIN only)
│   └── prisma/
│       └── schema.prisma          # All models & enums
│
├── src/
│   ├── main.tsx                   # Entry point
│   ├── lib/
│   │   └── auth.ts               # validateSession() — JWT verification utility
│   ├── app/
│   │   ├── App.tsx                # AppDateProvider + RouterProvider
│   │   ├── routes.ts              # All route definitions + loaders
│   │   ├── contexts/
│   │   │   └── AppDateContext.tsx  # Global date override for testing
│   │   ├── components/
│   │   │   ├── Layout.tsx         # Sidebar + mobile nav + date override banner
│   │   │   ├── Dashboard.tsx      # Home: container with Overview + Net Available tabs
│   │   │   ├── DashboardOverview.tsx  # Overview tab: period charts, recent transactions
│   │   │   ├── DashboardNetAvailable.tsx # Net Available tab: debit minus credit due
│   │   │   ├── Login.tsx          # Email/password login
│   │   │   ├── Onboarding.tsx     # First-time setup flow
│   │   │   ├── Transactions.tsx   # Transaction list with filters
│   │   │   ├── TransactionDetail.tsx  # Edit single transaction
│   │   │   ├── TransferDetail.tsx # View/edit individual transfers
│   │   │   ├── AddTransactionModal.tsx # Create income/expense/transfer
│   │   │   ├── CreditCards.tsx    # Credit card list
│   │   │   ├── CreditCardDetail.tsx   # Single card: cycle, chart, transactions
│   │   │   ├── DebitCards.tsx     # Debit account list
│   │   │   ├── CardDetail.tsx     # Single debit account detail
│   │   │   ├── ManageCards.tsx    # Drag-and-drop card order, edit/delete
│   │   │   ├── Statistics.tsx     # Spending charts, category breakdown
│   │   │   ├── Settings.tsx       # Profile, password, logout
│   │   │   ├── SettingsCategories.tsx  # Custom category editor with icons
│   │   │   ├── TesterPanel.tsx    # Date override + function testing
│   │   │   ├── LoadingScreen.tsx  # Reusable loading state
│   │   │   ├── figma/
│   │   │   │   └── ImageWithFallback.tsx # Image component with error fallback
│   │   │   └── ui/               # Shadcn/Radix UI component library (~48 components)
│   │   │       ├── Money.tsx      # Custom money display component
│   │   │       ├── button.tsx, card.tsx, dialog.tsx, tabs.tsx, ...
│   │   │       └── utils.ts      # cn() utility (clsx + tailwind-merge)
│   │   └── utils/
│   │       ├── formatMoney.ts     # Number → "1,234.50"
│   │       ├── transactionsMapper.ts  # Normalize API → UI transaction shape
│   │       ├── cardOrder.ts       # localStorage card ordering
│   │       └── mockData.ts        # Default categories, icons, seed data
│   └── styles/
│       ├── index.css              # Consolidated CSS imports (fonts, tailwind, theme)
│       ├── fonts.css              # Google Fonts (Inter 400-700)
│       ├── theme.css              # CSS custom properties / design tokens
│       ├── tailwind.css           # Tailwind directives
│       └── components/            # Per-component CSS (matches component name)
```

---

## Database Schema

All models live in the `leofy` PostgreSQL schema.

### Models

**User** (`users`): id, full_name, email (unique), password_hash, email_verified, is_active, last_login_at, created_at, role (USER/TESTER/ADMIN)

**Transaction** (`transactions`): id, user_id, type (INCOME/EXPENSE), amount (Decimal 12,2), description, occurred_at, card_id, category_id, metadata (JSON), created_at, transfer_id (UUID, links paired transfer transactions)

**CreditCard** (`cards`): id, user_id, name, brand (VISA/MASTERCARD/AMEX/OTHER), last4, credit_limit (Decimal), closing_day (SmallInt), due_day (SmallInt), created_at, color

**categories**: id, user_id, name, type (INCOME/EXPENSE), created_at

**sessions**: id, user_id, token_hash (unique), created_at, expires_at, revoked_at, user_agent, ip_address

### Enums
- `transaction_type`: INCOME, EXPENSE
- `user_role`: USER, TESTER, ADMIN
- `card_brand`: VISA, MASTERCARD, AMEX, OTHER
- `card_color`: RED, ORANGE, BLUE, GOLD, BLACK, PLATINUM, PURPLE, GREEN, SILVER, OTHER

### Key Conventions
- All IDs are `BigInt @id @default(autoincrement())`
- Timestamps use `@db.Timestamptz(6)`
- Amounts use `Decimal(12, 2)`
- Schema uses `@@schema("leofy")` on all models/enums
- Cards with `credit_limit > 0` = credit cards; `credit_limit = 0 or null` = debit accounts

---

## API Endpoints

Base: `http://localhost:4000` (env `VITE_API_BASE_URL`)

### Auth (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Login → returns `{ token, user }` |
| GET | `/me` | Get current user (includes role) |
| PUT | `/me` | Update name/email |
| PUT | `/me/password` | Change password (requires current_password) |

### Transactions (`/api/transactions`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all user transactions (desc by date) |
| GET | `/:id` | Get single transaction |
| POST | `/` | Create transaction |
| PUT | `/:id` | Update transaction |

**Transaction body**: `{ type, amount, category, description?, date?, card_id?, metadata? }`
**Metadata**: `{ paymentMethod: 'cash'|'debit'|'credit', category_name, installments?: { months, monthlyAmount?, startAt? } }`

### Cards (`/api/cards`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all cards |
| GET | `/:id` | Get single card |
| POST | `/` | Create card |
| PUT | `/:id` | Update card |
| DELETE | `/:id` | Delete card |

### Categories (`/api/categories`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List categories |
| PUT | `/` | Bulk replace: `{ categories: [{ name, type }] }` |

### Transfers (`/api/transfers`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create transfer: `{ fromCardId, toCardId, amount, description?, date? }` |
| GET | `/:transferId` | Get transfer details (both linked transactions) |
| PUT | `/:transferId` | Update transfer |
| DELETE | `/:transferId` | Delete transfer (removes both linked transactions) |

Transfer rules: Only from debit accounts. Creates 2 linked transactions (EXPENSE out + INCOME in) with same `transfer_id`. Metadata includes `transferRole`, `paymentMethod`, `fromCardId`, `toCardId`.

### Statistics (`/api/stats`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Dashboard data: income, expenses, balance, cards with used_amount |

### Tester (`/api/tester`) — requires TESTER/ADMIN role
| Method | Path | Description |
|--------|------|-------------|
| POST | `/test-cycle` | Calculate billing cycle dates |
| POST | `/test-stats-range` | Calculate stats date ranges |

---

## Authentication Flow

1. `POST /api/auth/login` with email + password
2. Backend returns JWT (`{ userId, role }`, expires 7d) + user object
3. Frontend stores in localStorage: `leofy_token`, `leofy_user`, `leofy_onboarded`
4. All API requests include `Authorization: Bearer <token>`
5. Backend `requireAuth` middleware verifies JWT, sets `req.user = { id, email, role }`
6. `requireRole("TESTER", "ADMIN")` middleware checks role (with DB fallback for old tokens)
7. Route loaders check `isLoggedIn()` and `hasOnboarded()` for client-side guards

---

## Key Business Logic

### Credit Card Billing Cycles
- Each card has `closing_day` (statement close) and `due_day` (payment due)
- **Active cycle**: from (previous closing day + 1) to (next closing day)
- `getNextMonthlyDate(dayOfMonth, refDate)`: returns next occurrence of a day (this month if not passed, otherwise next month)
- `getCurrentCycleInfo(card, today)`: returns cycleStart, cycleEnd, dueDate, daysUntilDue
- Dashboard shows: estimated due, already paid, progress bar, overdue status

### Installments (MSI)
- Stored in `metadata.installments`: `{ months, monthlyAmount, startAt }`
- Dashboard counts which month the user is in based on `startAt`
- Transactions list shows "X of Y months paid"

### Transfers
- Creates paired EXPENSE + INCOME transactions linked by `transfer_id` (UUID)
- Only from debit accounts (credit_limit = 0 or null)
- Supports full CRUD: create, read, update, and delete
- When "From Cash" selected in modal, posts directly to `/api/transactions` as INCOME on destination card (bypasses `/api/transfers` which requires numeric `fromCardId`)
- TransferDetail component at route `/transactions/transfers/:transferId` for viewing/editing individual transfers

### Payment Methods
- `cash`: no card association
- `debit`: from debit account (credit_limit = 0)
- `credit`: from credit card (requires card_id)

### Date Override (Tester Feature)
- `AppDateContext` provides `getAppDate()` — returns overridden date or `new Date()`
- Dashboard and Statistics use `getAppDate()` instead of `new Date()`
- Banner shows in Layout when override is active
- Only accessible to TESTER/ADMIN roles

---

## Design System

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#2DD4BF` | Brand teal, active states, buttons |
| Primary hover | `#14B8A6` | Hover states |
| Text primary | `#1F2933` | Headings, important text |
| Text muted | `#64748B` | Secondary text, labels |
| Background | `#F8FAFC` | Page background |
| Card | `#FFFFFF` | Card backgrounds |
| Border | `#F3F4F6` | Card borders, dividers |
| Income | `#10B981` | Green for income |
| Expense | `#EF4444` | Red for expenses |
| Warning | `#FACC15` | Yellow alerts |

### Card Color Gradients
RED, ORANGE, BLUE, GOLD, BLACK, PLATINUM, SILVER, PURPLE, GREEN, OTHER (default teal)

### CSS Approach
- Component-specific CSS files in `src/styles/components/` matching component name
- CSS custom properties in `theme.css`
- Tailwind utilities for layout
- Shadcn/Radix UI components in `src/app/components/ui/` for composable UI primitives
- Font: Inter (imported via `fonts.css` from Google Fonts)
- Cards use: `border: 1px solid #f3f4f6; border-radius: 1rem; padding: 1.5rem;`

---

## localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `leofy_token` | string | JWT auth token |
| `leofy_user` | JSON | User object (id, name, email, role) |
| `leofy_onboarded` | "true" | Onboarding completed flag |
| `leofy_card_order_v1` | JSON | Card drag-and-drop order array |

---

## Environment Variables

**Backend** (`.env`):
- `PORT` — Server port (default 4000)
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Token signing key
- `JWT_EXPIRES_IN` — Token expiration (default "7d")

**Frontend** (Vite):
- `VITE_API_BASE_URL` — Backend URL (default `http://localhost:4000`)

---

## Development

```bash
# Backend
cd backend && npm run dev    # nodemon on port 4000

# Frontend
npm run dev                  # vite on port 5173

# Database
cd backend && npx prisma db push      # Apply schema changes
cd backend && npx prisma generate     # Regenerate client
cd backend && npx prisma studio       # Visual DB browser
```

---

## Conventions

- All routes use `requireAuth` middleware
- Role-protected routes add `requireRole("TESTER", "ADMIN")` after `requireAuth`
- BigInt IDs are converted to strings in JSON responses (`BigInt.prototype.toJSON`)
- Frontend components follow pattern: fetch data in `useEffect`, store in `useState`, compute derived data in `useMemo`
- CSS class names follow `component-element-modifier` pattern (e.g., `settings-card`, `tester-run-btn`)
- Icons come from `lucide-react` library
- Money formatting uses `formatMoney()` utility — adds comma separators, no currency symbol
- Transaction normalization uses `normalizeTransactions()` from `transactionsMapper.ts`
