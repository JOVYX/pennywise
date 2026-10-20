# Pennywise 🪙 — Personal Finance & Savings Planner for iPhone

> **A mobile-first, offline-first Progressive Web App (PWA) designed specifically for college students in India to track irregular income, control unnecessary spending, eliminate debt, and reach their savings goals.**

---

## 📱 Features & Highlights

- **⚡ Lightning-Fast Expense Logging**: Record daily expenses in seconds with quick-select student presets (*Campus Tapri, Canteen, Mess Bill, Blinkit, Metro Recharge, Swiggy*).
- **📋 Indian Bank SMS & UPI Auto-Fill**:
  - Automatically parse debit/credit alert messages from HDFC, SBI, ICICI, Axis, Paytm, PhonePe, Google Pay, and CRED.
  - Extracts exact paise amount, merchant name, payment method, date, and intelligently auto-categorizes the expense in 1 tap.
- **🤝 Roommate & Friend Bill Splitter**:
  - Splitwise-style group bill splitter built for flatmates and campus trips.
  - Split expenses **equally**, **by shares**, or with **exact custom amounts** with guaranteed zero-loss paisa rounding.
  - Automatically creates personal debt/IOU records into IndexedDB and logs your share.
  - Generates WhatsApp-ready formatted breakdown text for instant group chat sharing.
- **🔒 App Lock & Privacy (PIN + Face ID)**:
  - Secure 4-digit passcode lock with SHA-256 hashing.
  - WebAuthn Biometric unlock support (Face ID / Touch ID / Fingerprint).
  - Configurable auto-lock delay (Immediate, 1 min, 5 min, 15 min) and brute-force lockout protection.
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
  - Full JSON backup export & schema-validated restore.
  - Spreadsheet CSV export.

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

Since iOS Safari restricts Service Workers and camera/PWA capabilities over non-secure connections, follow these exact instructions to test or install Pennywise on your iPhone:

### Option A: Local Wi-Fi Testing (Same LAN)
1. Ensure your iPhone and your Arch Linux laptop are connected to the same Wi-Fi network.
2. Run the preview or dev server with host enabled:
   ```bash
   npm run dev -- --host
   ```
3. Look at the terminal output for the Network address:
   ```
   ➜  Network: http://192.168.1.XX:5173/
   ```
4. On your iPhone, open **Safari** and enter that URL (`http://192.168.1.XX:5173/`).

> **Note on Service Worker / HTTPS**:
> iOS Safari requires **HTTPS** for full PWA Home Screen caching. For local HTTPS testing, you can use a tunnel tool such as `cloudflared` or `ngrok`:
> ```bash
> # Example using Cloudflare Tunnels (Zero install / instant HTTPS):
> npx cloudflared tunnel --url http://localhost:5173
> ```
> Cloudflare will print a secure `https://....trycloudflare.com` URL that can be opened directly on your iPhone Safari!

### Option B: Adding to iPhone Home Screen
1. Open Pennywise in **Safari** on your iPhone.
2. Tap the **Share** button (the square with an upward arrow in Safari's bottom toolbar).
3. Scroll down the share sheet and tap **Add to Home Screen**.
4. Confirm the title **Pennywise** and tap **Add** in the top-right corner.
5. The Pennywise icon will appear on your iOS Home Screen. When opened from the Home Screen, it runs in **standalone mode** without the Safari address bar, styled with safe area notches and iPhone-native touch interactions.

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
