---
name: Pennywise Design System
description: The Precision Manifest — High-density utilitarian personal accounting vault for Indian students
colors:
  primary: "#f59e0b"
  primary-hover: "#fbbf24"
  primary-deep: "#d97706"
  surface-root: "#080b11"
  surface-panel: "#0b0f17"
  surface-card: "#111827"
  surface-container: "#161e2e"
  border-hairline: "#1f293d"
  border-active: "#28354b"
  ink-primary: "#f1f5f9"
  ink-secondary: "#94a3b8"
  ink-tertiary: "#64748b"
  brand-emerald: "#10b981"
  brand-emerald-dim: "rgba(16, 185, 129, 0.15)"
  brand-rose: "#f43f5e"
  brand-rose-dim: "rgba(244, 63, 94, 0.15)"
typography:
  display:
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  mono-figure:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  label-mono:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
  body:
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Pennywise Design System: The Precision Manifest

## Overview
Pennywise is an offline-first, client-side personal finance web application built for Indian college students. It manages irregular income, mess bills, PG rents, tapri chai expenses, roommate splits, and emergency funds.

The visual system adheres to **The Precision Manifest**: a high-density, utilitarian public accounting ledger. It eschews generic gradient hero text and soft floating dropshadows in favor of crisp hairline borders, deep midnight enamel surfaces, and high-readability monospace figures.

## Colors
The palette is built for maximum legibility in high-stress financial situations:
- **Background Root (`#080b11`)**: Deep midnight obsidian base that prevents OLED eye strain.
- **Vault Panel (`#0b0f17`)**: High-contrast surface for the primary mobile container and audit drawers.
- **Card Enamel (`#111827`)**: Content modules, ledger widgets, and analytical breakdowns.
- **Inset Chips & Inputs (`#161e2e`)**: Tactile input backgrounds, category chips, and secondary button housings.
- **Hairline Borders (`#1f293d`)**: 1px structural framing defining exact modular boundaries.
- **Accent Amber (`#f59e0b`)**: Primary action indicators, interactive toggles, and warnings.
- **Affirmative Emerald (`#10b981`)**: Confirmed inflows, savings goal milestones, and solvent balances.
- **Liability Rose (`#f43f5e`)**: Outflows, debt balances, overdue bills, and destructive confirmation modals.

## Typography
The system employs a dual-typeface hierarchy:
- **Primary Interface**: `IBM Plex Sans` (`sans-serif`) provides humanized readability for headings, navigation labels, and descriptions.
- **Accounting Ledger**: `JetBrains Mono` (`monospace`) with strict tabular figures (`tnum`) for all currency amounts, mathematical calculations, percentages, dates, and status badges.
- **Labels & Audit Headers**: Monospaced uppercase with wide tracking (`letter-spacing: 0.08em; font-size: 10px; font-weight: 700;`) to give every financial block an unequivocal ledger header.

## Layout
- **Viewport Invariants**: Mobile-first centered frame (`max-w-md`), pinned to viewport height with iOS safe-area inset preservation (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
- **Navigation Architecture**:
  - Sticky operational header with real-time Vault status indicator and month cycle pagination.
  - Sticky bottom tab bar with 5 tactile items: Home (Journal), Transactions (Entries), Add (Tactile Quick Log), Budgets (Ceilings), Insights (Analytics), and Settings (Vault Controls).
- **Density**: High information density per vertical screen inch. Compact 4px–12px padding between items ensures zero wasted scrolling space for students reviewing transaction streams.

## Elevation & Depth
- **Zero Heavy Shadows**: The design eliminates fuzzy multi-layer Gaussian shadows.
- **Tonal Layering**: Depth is achieved entirely through background luminosity steps: `#080b11` (base) → `#0b0f17` (canvas) → `#111827` (card) → `#161e2e` (control).
- **Border Definiton**: 1px crisp borders (`#1f293d` / `#28354b`) provide razor-sharp demarcation between adjacent modules.

## Shapes
- **Corner Radii**:
  - `rounded-md` (6px): Badges, audit chips, micro-indicators.
  - `rounded-xl` (12px–14px): Input fields, secondary buttons, action sheets.
  - `rounded-2xl` (16px–18px): Dashboard widgets, modular containers, bottom sheets.
- **No Pill Buttons**: Avoid full-pill (`rounded-full`) styling on major action buttons to maintain an architectural, engineered ledger appearance.

## Components
1. **Balance & Allowance Manifest Cards**: High-visibility numbers paired with live daily spend meters, stipend countdowns, and expandable accounting breakdown drawers.
2. **Transaction Ledger Rows**: High-density transaction items with color-coded rupee values, payment method tags (UPI/Cash/Card), and merchant categorization.
3. **Bill Splitter Modal**: Roommate splitting with zero-loss paise conservation math, equal/share/custom tabs, and 1-tap WhatsApp summary export.
4. **Bank Statement Importer**: Multi-bank statement reconciler (SBI, HDFC, ICICI, Axis) with client-side deduplication against local Dexie.js records.
5. **Security Passcode Vault**: Monospace numeric keypad with biometrics support (Face ID / Touch ID) and rate-limited lockout countdown.

## Do's and Don'ts
- **DO** always format financial numbers with strict integer paise math via `rupeesToPaise` and `formatINR`.
- **DO** use `font-mono tabular-nums` for all numbers, amounts, percentages, and timestamps.
- **DO** maintain accessible text contrast of ≥ 4.5:1 across all midnight surfaces.
- **DON'T** use gradient hero text or multi-color decorative gradients behind balances.
- **DON'T** use `border-l-4` side-color accents on cards (the generic template tell).
- **DON'T** use elastic/bounce easing for validation failures; use horizontal exponential deceleration shakes.
- **DON'T** store floating-point currency values in the database.
