# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary User**: College students and young adults in India living on tight, irregular allowances, part-time stipends, or freelance income.
- **Situation**: Managing daily campus expenses (mess, canteen, tapri chai, xerox, quick commerce like Blinkit/Zepto), sharing flat/hostel rent and utility bills with roommates, tracking pending money lent or owed, and trying to build initial savings habits without complex corporate accounting overhead.
- **Job to be Done**: Know exactly how much safe-to-spend cash remains today, log or parse expenses in seconds via UPI/SMS, split group bills fairly without paisa leakage, and avoid running out of money before the next allowance or stipend arrives.

## Product Purpose

- **Why it exists**: Mainstream budgeting tools are either bloated enterprise software, subscription-locked, cloud-dependent, or built around steady Western monthly salaries and credit cards instead of Indian UPI transactions, cash allowances, and informal roommate sharing.
- **What it does**: Provides an instant, private, offline-first personal finance planner and daily spending assistant tailored for Indian college life and irregular cash flows.
- **What success means**: The student stays within realistic daily spending limits, eliminates roommate debt friction, never suffers from unexplained balance discrepancies, and keeps all financial records 100% private on their personal device.

## Positioning

- **Core Mechanism & Uncopyable Position**:
  - **100% Local-First & Zero-Telemetry**: Pure client-side IndexedDB persistence (via Dexie.js); no cloud database, no tracking, no external server dependency, and fully operational offline.
  - **Indian Financial DNA**: Native Indian currency formatting (paise integer storage, Lakhs & Crores grouping `₹1,25,000`), local bank SMS & UPI clipboard auto-parsing (HDFC, SBI, ICICI, Axis, Paytm, PhonePe, GPay, CRED), and campus-ready presets.
  - **Strict Financial Invariants**: Zero double-counting across accounts; clear separation between actual confirmed cash balance and expected future income; and savings goals that reserve actual cash rather than inflating net worth.
  - **Deterministic Smart Assistant**: Realistic daily spending limits (conservative, balanced, flexible cushions) and local rule-based saving suggestions without sending sensitive bank alerts to third-party AI models.

## Operating Context

- **Environment**: Mobile Safari / Chrome on iOS and Android devices (optimized for iPhone 'Add to Home Screen' standalone PWA mode with safe area notches and iOS touch feel), fully operational on desktop browsers.
- **Workflows & Rituals**:
  - Quick-tap expense logging immediately after paying at a canteen/tapri or receiving a bank/UPI notification.
  - Copy-pasting bank SMS alerts for 1-tap extraction of amount, merchant, and category.
  - Bill splitting for group dinners, grocery hauls, or flat rent, generating WhatsApp breakdown messages.
  - Checking daily allowance before impulsive discretionary spends.
  - Periodic JSON backups stored to local device files or iCloud/Drive.

## Capabilities and Constraints

- **Confirmed Functionality**:
  - Expense & Income Logging with student presets (*Campus Tapri, Canteen, Mess Bill, Blinkit, Metro Recharge, Swiggy*).
  - Indian Bank SMS / UPI notification clipboard auto-parser.
  - Roommate & Friend bill splitter with equal, share-based, or custom splits, guaranteed zero-loss paisa rounding, and WhatsApp share formatting.
  - Personal debt / IOU tracking integrated with actual cash flow.
  - Passcode lock (4-digit PIN with SHA-256) and WebAuthn Biometric unlock (Face ID / Touch ID).
  - Multi-account management with transfer invariant checking (net transfer sum = 0).
  - Savings goals with cash reservations.
  - Recharts visual analytics (spending pace, category donut, monthly comparison).
  - Local JSON export/restore and CSV spreadsheet export.
- **Technical & Architectural Constraints**:
  - Zero server-side storage; all data resides in IndexedDB (`pennywise_db`).
  - Strict integer paisa arithmetic to avoid floating-point rounding errors.
  - Offline-first Service Worker caching via `vite-plugin-pwa`.
  - Client-side deterministic logic only for insights and spending algorithms.

## Brand Commitments

- **Name**: Pennywise 🪙
- **Tone & Voice**: Grounded, empowering, trustworthy, transparent, practical, and campus-friendly. No condescending finance jargon or predatory loan prompts.
- **Identity Constraints**: Mobile-first ergonomics, clean tactile controls, swift feedback, respectful of user privacy and device battery.

## Evidence on Hand

- Complete working implementation in `src/` (Vite, React 19, TypeScript, Tailwind CSS v4, Dexie.js, Recharts).
- Comprehensive test suite in `tests/` validating financial invariants, statement import flows, and bill splitting logic.
- Documentation and architecture details committed in `README.md`.
- Sample data fixtures available in `src/data/sampleData.ts`.

## Product Principles

1. **Absolute Local Privacy**: Financial data belongs exclusively to the user's device. No analytics, no cloud telemetry, no third-party tracking.
2. **Mathematical Invariant Integrity**: Balances, debt splits, and transfers must balance to the exact paisa. Never distort actual cash with future projections or double-counted internal transfers.
3. **Speed of Capture Over Bureaucracy**: Recording an expense or splitting a bill must take seconds with minimum friction, keyboard typing, or cognitive load.
4. **Actionable Daily Clarity**: Instead of overwhelming students with complex accounting charts, translate finances into simple, actionable guidance: *“Here is what you can safely spend today.”*
5. **Resilient Offline Utility**: The app must remain 100% usable without an active internet connection, functioning seamlessly whether on campus Wi-Fi or offline in a basement canteen.

## Accessibility & Inclusion

- High contrast text readability for both indoor and bright outdoor campus sunlight.
- Touch target sizing conforming to mobile tap guidelines (minimum 44x44px for primary interactions).
- Keyboard navigability and ARIA accessibility labels across transaction inputs, modals, and charts.
- Form inputs supporting screen-reader announcements and error states.
