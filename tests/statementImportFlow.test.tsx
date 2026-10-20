import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App';
import { resetAllData, seedSampleData, db } from '../src/db';

describe('Bank Statement Import User Flow', () => {
  beforeEach(async () => {
    await resetAllData();
  });

  it('allows opening Bank Statement Import modal from Transactions tab and importing sample SBI statement', async () => {
    await seedSampleData();

    render(<App />);

    // Wait for initial dashboard load
    await waitFor(() => {
      expect(screen.getByText(/Available To Spend/i)).toBeInTheDocument();
    });

    // Navigate to Transactions Tab
    const txTab = screen.getByRole('button', { name: /transactions/i });
    fireEvent.click(txTab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search merchant, notes, category/i)).toBeInTheDocument();
    });

    // Find and click the 'Import Bank Statement' button
    const importBtn = screen.getByRole('button', { name: /import bank statement/i });
    expect(importBtn).toBeInTheDocument();
    fireEvent.click(importBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText(/Import Bank Statement/i)).toBeInTheDocument();
      expect(screen.getByText(/Try Sample SBI CSV/i)).toBeInTheDocument();
    });

    // Click 'Try Sample SBI CSV'
    const sampleSbiBtn = screen.getByText(/Try Sample SBI CSV/i);
    fireEvent.click(sampleSbiBtn);

    // Should detect SBI and render preview table
    await waitFor(() => {
      expect(screen.getByText(/State Bank of India \(SBI\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Import 7 Transactions/i)).toBeInTheDocument();
    });

    // Verify row contents
    expect(screen.getAllByText(/Campus Tapri Chai/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Rapido Bike Taxi/i)[0]).toBeInTheDocument();

    // Click 'Import 7 Transactions'
    const submitImportBtn = screen.getByText(/Import 7 Transactions/i);
    fireEvent.click(submitImportBtn);

    // Verify modal closes after successful import
    await waitFor(
      () => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    // Verify transactions exist in Dexie DB
    const allTxs = await db.transactions.toArray();
    const tapriTx = allTxs.find((t) => t.merchant.includes('Campus Tapri Chai'));
    expect(tapriTx).toBeDefined();
    expect(tapriTx?.amountPaise).toBe(6000); // ₹60 = 6000 paise
    expect(tapriTx?.type).toBe('expense');
  });

  it('allows opening Bank Statement Import from Settings tab and deduplicating existing records', async () => {
    await seedSampleData();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Available To Spend/i)).toBeInTheDocument();
    });

    // Navigate to Settings Tab
    const settingsTab = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByText(/Data & Local Backups/i)).toBeInTheDocument();
    });

    // Click 'Import Bank Statement' in Settings
    const importCard = screen.getByText(/Import Bank Statement/i).closest('button')!;
    fireEvent.click(importCard);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Load HDFC sample
    const sampleHdfcBtn = screen.getByText(/Try Sample HDFC CSV/i);
    fireEvent.click(sampleHdfcBtn);

    // Verify HDFC detected
    await waitFor(() => {
      expect(screen.getByText(/HDFC Bank/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Apollo Pharmacy/i)[0]).toBeInTheDocument();
  });
});
