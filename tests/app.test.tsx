import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App';
import { resetAllData, seedSampleData, db } from '../src/db';

describe('Pennywise Full User Flows', () => {
  beforeEach(async () => {
    await resetAllData();
  });

  it('renders onboarding modal on clean launch and permits loading sample data', async () => {
    render(<App />);

    // Onboarding modal should be rendered
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Pennywise/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Personal Finance for Indian Students/i)).toBeInTheDocument();

    // Click 'Explore with Student Sample Data'
    const sampleBtn = screen.getByText(/Explore with Student Sample Data/i);
    fireEvent.click(sampleBtn);

    // After loading sample data, onboarding should dismiss and show Dashboard
    await waitFor(() => {
      expect(screen.getByText(/Available To Spend/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Daily Spending Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent Transactions/i)).toBeInTheDocument();
  });

  it('allows navigating across all 5 bottom navigation tabs', async () => {
    // Seed data first
    await seedSampleData();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Available To Spend/i)).toBeInTheDocument();
    });

    // 1. Transactions Tab
    const txTab = screen.getByRole('button', { name: /transactions/i });
    fireEvent.click(txTab);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search merchant, notes, category/i)).toBeInTheDocument();
    });

    // 2. Budgets Tab
    const budgetsTab = screen.getByRole('button', { name: /budgets/i });
    fireEvent.click(budgetsTab);
    await waitFor(() => {
      expect(screen.getByText(/Monthly Spending Allowance/i)).toBeInTheDocument();
    });

    // 3. Insights Tab
    const insightsTab = screen.getByRole('button', { name: /insights/i });
    fireEvent.click(insightsTab);
    await waitFor(() => {
      expect(screen.getByText(/Income vs Expenses/i)).toBeInTheDocument();
    });

    // 4. Settings Tab
    const settingsTab = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsTab);
    await waitFor(() => {
      expect(screen.getByText(/Preferences & Display/i)).toBeInTheDocument();
      expect(screen.getByText(/Export JSON/i)).toBeInTheDocument();
      expect(screen.getByText(/Install on iPhone/i)).toBeInTheDocument();
    });

    // 5. Back to Home
    const homeTab = screen.getByRole('button', { name: /home/i });
    fireEvent.click(homeTab);
    await waitFor(() => {
      expect(screen.getByText(/Available To Spend/i)).toBeInTheDocument();
    });
  });

  it('allows recording a new expense transaction and immediately updates UI', async () => {
    await seedSampleData();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Available To Spend/i)).toBeInTheDocument();
    });

    // Click '+' Add Transaction button
    const addBtn = screen.getByRole('button', { name: /add transaction/i });
    fireEvent.click(addBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Enter amount: 150
    const amountInput = screen.getByPlaceholderText('0');
    fireEvent.change(amountInput, { target: { value: '150' } });

    // Enter merchant: Campus Tapri
    const merchantInput = screen.getByPlaceholderText(/e\.g\. Tapri, Swiggy, Mess/i);
    fireEvent.change(merchantInput, { target: { value: 'Campus Tapri' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /save transaction/i });
    fireEvent.click(submitBtn);

    // Verify modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Verify transaction exists in db
    const txs = await db.transactions.toArray();
    const recorded = txs.find((t) => t.merchant === 'Campus Tapri');
    expect(recorded).toBeDefined();
    expect(recorded?.amountPaise).toBe(15000); // ₹150 = 15000 paise
  });
});
