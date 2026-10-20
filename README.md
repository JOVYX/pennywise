# Pennywise 🪙 — Personal Finance & Savings Planner for iPhone

> **A mobile-first, offline-first Progressive Web App (PWA) designed specifically for college students in India to track irregular income, control unnecessary spending, eliminate debt, and reach their savings goals.**

---

## 📱 Features & Highlights

- **⚡ Lightning-Fast Expense Logging**: Record daily expenses in seconds with quick-select student presets (*Campus Tapri, Canteen, Mess Bill, Blinkit, Metro Recharge, Swiggy*).
- **📋 Bank SMS & UPI Alert Parser**:
  - Paste a bank SMS or UPI alert message and Pennywise parses it (supports debit/credit alerts from HDFC, SBI, ICICI, Axis, Paytm, PhonePe, Google Pay, and CRED).
  - *Browser transparency*: Web browsers cannot automatically read incoming device SMS messages. You simply copy-paste your SMS alert, and Pennywise extracts the exact paise amount, merchant name, payment method, date, and auto-categorizes the expense in 1 tap.
- **🤝 Roommate & Friend Bill Splitter**:
  - Splitwise-style group bill splitter built for flatmates and campus trips.
  - Split expenses **equally**, **by shares**, or with **exact custom amounts** with guaranteed zero-loss paisa rounding.
  - Automatically creates personal debt/IOU records into IndexedDB and logs your share.
  - Generates WhatsApp-ready formatted breakdown text for instant group chat sharing.
- **🔒 App Lock Privacy Screen (PIN + Face ID)**:
  - Convenient 4-digit passcode privacy screen to prevent shoulder-surfing and casual snooping.
  - WebAuthn biometric unlock support (Face ID / Touch ID / Fingerprint) when accessed over a secure HTTPS connection.
  - Configurable auto-lock delay (Immediate, 1 min, 5 min, 15 min) and brute-force lockout protection.
  - *Important security note*: App Lock is a UI privacy screen, **not** encryption. Data stored within your device's IndexedDB is not encrypted.
- **🇮🇳 Built for Indian Financial Life**:
  - Default currency in Indian Rupees (**INR ₹**) with standard Indian grouping (*₹1,25,000* Lakhs & Crores formatting).
  - Exact integer **paise** storage to eliminate JavaScript floating-point rounding quirks.
  - Tailored student categories: PG/Flat rent, Mess coupons, Chai tapri & snacks, Metro passes, Books/Xerox, UPI cashbacks, and Splitwise debt repayments.
- **🛡️ Rock-Solid Financial Invariants**:
  - **Actual Balance**: Opening balances + received income - completed expenses (adjusted for internal account transfers).
  - **Zero Double-Counting**: Transfers between tracked accounts never inflate income or expense totals.
  - **Irregular Income Tracking**: Expected future income is tracked on a calendar and clearly separated from confirmed cash.
  - **Goal Reservations**: Savings goal contributions reserve existing cash without distorting external expenses or magically duplicating money.
- **🎯 Smart Daily Spending Assistant**:
  - Calculates a realistic daily spending limit based on confirmed unencumbered cash, pending rent/bills, and days until your next expected income.
  - Choose between **Conservative** (15% safety cushion), **Balanced** (5% cushion), or **Flexible** spending strategies.
- **💡 Rule-Based "Ways to Save"**:
  - 100% deterministic local insights (e.g., flags when chai/tapri snacks exceed 20% of your food budget or identifies subscription bloat) without sending any personal data to external AI servers.
- **📈 Recharts Visual Analytics**:
  - Income vs Expense monthly comparison.
  - Category breakdown donut chart.
  - Daily spending pace area trend.
- **🔒 Privacy & Local-First**:
  - Stored purely inside your device's browser via **IndexedDB (Dexie.js)**.
  - Zero telemetry, zero analytics, zero external API keys, zero tracking.
  - Note: IndexedDB data is unencrypted on device storage; App Lock acts as a client-side privacy screen.
  - Full JSON backup export & schema-validated restore.
  - Spreadsheet CSV export.

---

## ⚠️ Known Limitations

1. **iOS PWA Storage Partitioning**:
   - Adding Pennywise to your iPhone Home Screen creates an isolated standalone web app container.
   - iOS Safari keeps this storage completely separate from regular Safari browser tabs. Data entered in Safari does not automatically appear in the Home Screen app and vice versa.
   - When transitioning between Safari and your Home Screen app, use **Settings → Export JSON** in Safari, then **Settings → Restore from Backup** in the installed app.
2. **Safari Storage Eviction Risk**:
   - On iOS, WebKit applies a 7-day storage eviction rule for web applications without user interaction. If you don't open the app for an extended period or if device storage runs critically low, WebKit may evict client-side IndexedDB databases and cached files.
   - Pennywise requests persistent storage (`navigator.storage.persist()`), but regularly exporting a JSON backup to iCloud Drive or the iOS Files app is strongly recommended.
3. **No Automatic SMS Inbox Access**:
   - Web browsers (unlike native Android apps with SMS permissions) cannot passively read incoming SMS alerts in the background. You must copy and paste SMS alerts into the parser.
4. **No Cloud Sync or Multi-Device Sync**:
   - Pennywise has no central server, backend database, or cloud sync. Your data exists only inside the browser where it was recorded. If you switch devices or reset your browser without a backup, your data cannot be recovered remotely.
5. **HTTPS Requirement for PWA & Biometrics**:
   - Service Workers (offline caching, PWA installation) and WebAuthn (Face ID / Touch ID) strictly require a secure context (`https://` or `localhost`). Testing over plain HTTP LAN addresses (e.g. `http://192.168.x.x:5173`) will disable both features.

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript (strict mode)
- **Bundler**: Vite 8 with `@tailwindcss/vite` (Tailwind CSS v4)
- **Local Storage**: IndexedDB via Dexie.js (with versioned schema & transactions)
- **Visual Analytics**: Recharts
- **PWA & Offline**: `vite-plugin-pwa` with Service Worker & Web App Manifest
- **Testing**: Vitest + React Testing Library + `@testing-library/jest-dom` + `fake-indexeddb`

---

## 🚀 Running Locally (Arch Linux / Linux)

### Prerequisites
- Node.js (v20+ or v26+)
- npm

### 1. Development Server
To launch the Vite development server with LAN network listening:
```bash
npm run dev
```
By default, the server listens on `http://localhost:5173/` and exposes your local Wi-Fi / Ethernet LAN IP (e.g. `http://192.168.1.x:5173/`).

### 2. Running Automated Tests
Run the complete unit and integration test suite:
```bash
npm run test
```

### 3. Production Build & Preview
To create an optimized production build:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview -- --host
```

---

## 📲 Testing & Installing on iPhone

Since iOS Safari restricts Service Workers, offline caching, and WebAuthn (Face ID / Touch ID) over non-secure connections, follow these exact instructions to test or install Pennywise on your iPhone:

> **Important: Network & Context Constraints**
> - **Service Workers** work on `localhost` and **HTTPS only**. They will **not** register over plain HTTP LAN addresses (`http://192.168.x.x`).
> - **Face ID / WebAuthn** strictly requires a secure context (**HTTPS**). It is completely unavailable over `http://192.168.x.x`.

### Option A: Local Wi-Fi Testing (Same LAN via Secure Tunnel)
1. Ensure your iPhone and your Arch Linux laptop are connected to the same Wi-Fi network.
2. Run the dev server:
   ```bash
   npm run dev
   ```
3. In a second terminal, open a secure HTTPS tunnel using `cloudflared`:
   ```bash
   npx cloudflared tunnel --url http://localhost:5173
   ```
4. Cloudflare will output an `https://....trycloudflare.com` URL. Open that secure HTTPS link in Safari on your iPhone.
5. Service Workers, offline caching, and WebAuthn Face ID unlock will all work properly!

### Option B: Adding to iPhone Home Screen
1. Open Pennywise in **Safari** on your iPhone via HTTPS (your tunnel or production URL).
2. Tap the **Share** button (the square with an upward arrow in Safari's bottom toolbar).
3. Scroll down the share sheet and tap **Add to Home Screen**.
4. Confirm the title **Pennywise** and tap **Add** in the top-right corner.
5. The Pennywise icon will appear on your iOS Home Screen. When opened from the Home Screen, it runs in **standalone mode** without the Safari address bar, styled with safe area notches and iPhone-native touch interactions.
6. *Note*: Standalone Home Screen apps use an isolated storage partition separate from Safari. If you started entering data in Safari, export a JSON backup and restore it inside the Home Screen app.

---

## 💾 Data Backups & Privacy

Pennywise keeps your financial data 100% private on your own device:
- **Exporting Backup**: Go to **Settings** → tap **Export JSON**. Save the file to your iPhone **Files** app (or iCloud Drive).
- **Restoring Backup**: Go to **Settings** → tap **Restore from Backup** → select your `.json` file. The schema is automatically verified before atomic restoration.
- **Exporting to Excel**: Tap **Export CSV** to download a spreadsheet of all transactions.
- **Sample Data**: In **Settings**, tap **Load Sample Data** to explore realistic student figures, or tap **Clear Sample Data** to remove only demo records without touching your personal transactions.

---

## 📐 Financial Invariants & Formulas

1. **Actual Total Balance**:
   $$\text{Actual Balance} = \sum \text{Opening Balances} + \sum \text{Actual Income} - \sum \text{Actual Expenses}$$
   *Internal transfers between accounts adjust individual account balances, but the net sum across all tracked accounts is invariant ($+0$).*
2. **Spendable Cash**:
   $$\text{Available to Spend} = \max(0, \text{Actual Balance} - \text{Savings Goals} - \text{Reserved Bills \& Debts})$$
3. **Daily Spending Allowance**:
   $$\text{Daily Limit} = \left\lfloor \frac{\text{Spendable Cash} \times (1 - \text{Cushion})}{\text{Days Remaining}} \right\rfloor$$
   - Conservative: 15% safety buffer
   - Balanced: 5% safety buffer
   - Flexible: 0% safety buffer
4. **Savings Rate**:
   $$\text{Savings Rate} = \max\left(0, \min\left(100, \frac{\text{Income} - \text{Expenses}}{\text{Income}} \times 100\right)\right)$$
   *(Evaluates to $0\%$ when income is zero to prevent division anomalies).*

---

## 🌐 Deployment Guide

### Cloudflare Pages (Recommended)
Pennywise includes pre-configured `wrangler.toml`, `public/_headers` (security headers & PWA caching rules), and `public/_routes.json` (SPA client-side routing).
1. Connect your repository to **Cloudflare Pages**.
2. Set **Build command**: `npm run build`
3. Set **Build output directory**: `dist`
4. Deploy!

### Vercel
1. Import repository on Vercel.
2. Select framework preset: **Vite**.
3. Build command: `npm run build`, output: `dist`.
4. Deploy.

### GitHub Pages
1. Set the base path to your repository name using the `BASE_URL` environment variable:
   ```bash
   BASE_URL=/pennywise/ npm run build
   ```
2. Deploy the generated `dist/` directory via the standard `actions/deploy-pages` workflow.

---

## 🏗️ Architecture Overview

### Folder Structure
```text
pennywise/
├── e2e/                     # Playwright end-to-end smoke test suite (iOS/WebKit & Chromium)
├── public/                  # PWA icons, manifest, _headers, _routes.json
├── src/
│   ├── components/          # Reusable UI widgets & domain modals
│   │   ├── common/          # Category icons, badges
│   │   ├── dashboard/       # Balance card, daily allowance, charts, insights, backup banner
│   │   ├── importer/        # Bank statement parsing (CSV & Excel .xlsx)
│   │   ├── layout/          # Header, BottomNav navigation shell
│   │   ├── onboarding/      # First-launch onboarding modal & balance wizard
│   │   ├── security/        # LockScreen PIN & biometric verification
│   │   ├── splitter/        # BillSplitterModal with zero-loss paise split
│   │   └── transactions/    # TransactionModal with SMS paste & auto-fill
│   ├── context/             # AppContext & reactive Dexie live queries (useLiveQuery)
│   ├── data/                # Default Indian student categories & seed data
│   ├── db/                  # Dexie.js database schema versions (v1 -> v2) & migrations
│   ├── types/               # Strict TypeScript domain interfaces
│   ├── utils/               # Pure financial formulas, security, formatters, storage
│   └── views/               # Dashboard, Transactions, Budgets, Insights, Settings
└── tests/                   # Vitest unit, integration, and fast-check property test suites
```

### Data Flow
```text
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│   User Action   │ ────> │   AppContext    │ ────> │  Dexie IndexedDB │
│ (Form/Button)   │       │  Action Methods │       │  Atomic Mutation │
└─────────────────┘       └─────────────────┘       └──────────────────┘
                                                              │
                                                              ▼
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│ UI Components   │ <──── │  React State    │ <──── │   useLiveQuery   │
│ Re-render Inst. │       │   (useMemo)     │       │  Reactive Feed   │
└─────────────────┘       └─────────────────┘       └──────────────────┘
```

### Where Invariants are Enforced
- **Integer Paise Only**: Enforced across [`src/types/index.ts`](file:///home/jovyxmc/Projects/expense%20tracker/src/types/index.ts) and [`src/utils/formatters.ts`](file:///home/jovyxmc/Projects/expense%20tracker/src/utils/formatters.ts) via `rupeesToPaise` and `paiseToRupees`. Never use floats for currency calculations.
- **Account Transfer Conservation**: In [`src/utils/finance.ts`](file:///home/jovyxmc/Projects/expense%20tracker/src/utils/finance.ts) inside `calculateAccountBalances()`. Internal transfers increment one ledger and decrement another; combined balance sum remains strictly unchanged ($+0$).
- **Spendable Cash & Goal Ring-fencing**: In [`src/utils/finance.ts`](file:///home/jovyxmc/Projects/expense%20tracker/src/utils/finance.ts) inside `calculateMonthlySummary()`. Goals and pending bills reserve money without artificially creating or deleting cash. If obligations exceed cash, `isOvercommitted: true` surfaces the deficit immediately.
- **Zero-Loss Bill Splitting**: In [`src/utils/billSplitter.ts`](file:///home/jovyxmc/Projects/expense%20tracker/src/utils/billSplitter.ts) inside `calculateBillSplit()`. Remainder paise are systematically distributed down to the exact paisa with $0$ remainder. In exact custom mode, mismatched allocations are flagged with discrepancy banners and disabled submissions.
- **Database Schema Upgrades**: In [`src/db/index.ts`](file:///home/jovyxmc/Projects/expense%20tracker/src/db/index.ts) via Dexie versioned `.upgrade()` handlers, tested via [`tests/migration.test.ts`](file:///home/jovyxmc/Projects/expense%20tracker/tests/migration.test.ts).
- **Atomic Backup Validation**: In [`src/db/index.ts`](file:///home/jovyxmc/Projects/expense%20tracker/src/db/index.ts) inside `importDatabaseFromJson()`, validated with Zod schemas and executed in a single atomic transaction rollback.

---

## 💡 Design Decisions

### 1. Why Integer Paise?
JavaScript represents all numbers as IEEE 754 64-bit floating point numbers. Operations like `0.1 + 0.2 = 0.30000000000000004` or `19.99 * 100 = 1998.9999999999998` inevitably corrupt balances, ledgers, and budget totals over time. By storing every monetary figure as an exact integer quantity of **paise** (where ₹1 = 100 paise), all math is integer-pure, fast, and 100% loss-free.

### 2. Why Local-First with No Backend?
- **Privacy for Students**: College students should never have to upload bank SMS messages, PG rents, canteen bills, or personal loans to a third-party cloud database.
- **Instant 0ms Latency**: Queries run directly against in-memory IndexedDB with zero network round trips.
- **True Offline PWA**: Works continuously during spotty campus Wi-Fi, basement classrooms, metro commutes, and airplane mode.
- **Zero Operational Costs**: No server hosting bills, no cloud database maintenance, and zero subscription costs for students.

### 3. Why Rule-Based Insights Instead of AI?
- **Deterministic & Verifiable**: Financial rules (e.g. detecting if snack spending exceeds 25% of food expenses, or warning when discretionary purchases exceed 45%) give students clear, actionable, mathematical advice.
- **Zero Hallucinations**: Rule engines cannot hallucinate non-existent debts or phantom expenses.
- **Privacy-Preserving**: No private bank statements or spending habits are transmitted to external LLM APIs (OpenAI, Anthropic, or Google Cloud).
- **Offline Reliability**: Insights generate instantly offline without an internet connection.

---

## 📸 Screenshots & Live Demo

- **Live Demo URL**: [https://pennywise.pages.dev](https://pennywise.pages.dev) *(or your deployed custom domain)*

### 📱 iPhone Screenshot Capture Checklist
When capturing marketing or App Store / PWA showcase screenshots on an iPhone (Safari or Home Screen standalone mode), capture these 6 key views:

1. **Dashboard Overview**:
   - Available to spend headline figure (`₹X,XXX`).
   - Tracked Vault Ledgers (`Primary Bank`, `UPI Wallet`, `Cash in Pocket`).
   - Daily Spending Assistant card with cushion selector (`Safe`, `Bal`, `Flex`).
2. **Fast Expense Logger with SMS Auto-Fill**:
   - Tap `+` button in navigation.
   - Expand `PARSE SMS` drawer with a pasted bank/UPI debit message auto-filled into amount and merchant.
3. **Roommate & Canteen Bill Splitter**:
   - `Split with Friends` modal with participants (`You`, `Aman`, `Rohan`).
   - Split breakdown with WhatsApp-ready settlement preview.
4. **Bank Statement Importer**:
   - Bank Statement Import modal showing parsed transactions from an SBI or HDFC statement with classification badges.
5. **Passcode & Privacy Screen**:
   - Lock screen showing PIN verification dots, numeric keypad, and Touch ID / Face ID icon.
6. **Settings & Data Safety**:
   - Settings tab showing iOS Storage Persistence status (`PERSISTENT`), backup age (`Last Backup: Today`), and JSON backup export options.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — see the [LICENSE](LICENSE) file for details.
