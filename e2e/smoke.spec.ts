import { test, expect } from '@playwright/test';

// Helper to dismiss onboarding modal if it appears
async function ensureOnboarded(page: any) {
  try {
    const sampleBtn = page.getByRole('button', { name: /Explore with Student Sample Data/i });
    await sampleBtn.waitFor({ state: 'visible', timeout: 3000 });
    await sampleBtn.click();
    await sampleBtn.waitFor({ state: 'hidden', timeout: 3000 });
  } catch {
    // Already onboarded or clean
  }
}

test.describe('Pennywise Smoke Tests (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await ensureOnboarded(page);
  });

  test('1. Add an expense', async ({ page }) => {
    // Open add transaction modal
    await page.locator('button[aria-label="Add transaction"]').click();

    // Fill expense amount using ID
    await page.locator('#input-transaction-amount').fill('150');

    // Fill merchant using ID
    await page.locator('#input-transaction-merchant').fill('Campus Tapri Chai');

    // Submit transaction using ID
    await page.locator('#btn-submit-transaction').click();

    // Assert that the expense is recorded and visible in recent transactions
    await expect(page.locator('text=Campus Tapri Chai').first()).toBeVisible({ timeout: 6000 });
  });

  test('2. Paste bank SMS and parse it', async ({ page }) => {
    // Open add transaction modal
    await page.locator('button[aria-label="Add transaction"]').click();

    // Open SMS parser drawer
    await page.getByRole('button', { name: /PARSE SMS/i }).click();

    // Fill SMS text
    const smsInput = page.locator('textarea[aria-label="Paste SMS text"]');
    await smsInput.fill('Sent Rs.75.00 from SBI A/c to Samosa Corner on 16-10-2026 UPI Ref 9876543210');

    // Apply parsed transaction
    await page.getByRole('button', { name: /Apply/i }).click();

    // Verify merchant was populated
    await expect(page.locator('#input-transaction-merchant')).toHaveValue('Samosa Corner');

    // Save transaction
    await page.locator('#btn-submit-transaction').click();
    await expect(page.locator('text=Samosa Corner').first()).toBeVisible({ timeout: 6000 });
  });

  test('3. Create a bill split with friends', async ({ page }) => {
    // Navigate to Transactions tab and open split bill modal
    await page.locator('button[aria-label="Transactions"]').click();
    await page.locator('#btn-split-bill').click();

    // Enter bill title and total
    const titleInput = page.locator('input[placeholder*="Swiggy Dinner"]').first();
    await titleInput.fill('Hostel Pizza Party');

    const totalInput = page.locator('input[placeholder="0"]').first();
    await totalInput.fill('600');

    // Save to Pennywise
    await page.getByRole('button', { name: /Save to Pennywise/i }).click();

    // Verify modal closes
    await expect(page.locator('#split-modal-title')).not.toBeVisible({ timeout: 6000 });
  });

  test('4. Export backup and restore from backup', async ({ page }) => {
    // Navigate to Settings
    await page.locator('button[aria-label="Settings"]').click();

    // Trigger JSON Export
    await page.locator('#btn-export-json').click();

    // Verify export completed toast or indicator
    await expect(page.locator('text=Backup exported and saved!').first()).toBeVisible({ timeout: 6000 });

    // Create a mock backup JSON and restore
    const sampleBackup = {
      app: 'Pennywise',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        accounts: [
          {
            id: 'acc-primary-bank',
            name: 'Primary SBI',
            type: 'bank',
            openingBalancePaise: 500000,
            color: '#3b82f6',
            icon: 'Landmark',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        categories: [],
        transactions: [
          {
            id: 'tx-restored-1',
            type: 'expense',
            amountPaise: 25000,
            accountId: 'acc-primary-bank',
            categoryId: 'food-mess',
            date: new Date().toISOString(),
            merchant: 'Restored Biryani Hub',
            paymentMethod: 'upi',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        savingsGoals: [],
        debts: [],
        recurringRules: [],
        budgets: [],
        settings: []
      }
    };

    // Upload via file input
    const fileInput = page.locator('input[type="file"][accept=".json"]');
    await fileInput.setInputFiles({
      name: 'pennywise-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sampleBackup))
    });

    await expect(page.locator('text=Data restored successfully.').first()).toBeVisible({ timeout: 6000 });
  });

  test('5. Lock and unlock with PIN', async ({ page }) => {
    // Navigate to Settings
    await page.locator('button[aria-label="Settings"]').click();

    // Click Activate Passcode
    await page.getByRole('button', { name: /Activate/i }).click();

    // Type PIN in create step
    const pinInput = page.locator('input[type="password"]');
    await pinInput.fill('1234');

    // Confirm step
    await pinInput.fill('1234');
    await page.getByRole('button', { name: /Confirm PIN/i }).click();

    // Verify activated toast
    await expect(page.locator('text=Passcode protection activated!').first()).toBeVisible({ timeout: 6000 });

    // Lock Vault Now
    await page.getByRole('button', { name: /Lock Vault Now/i }).click();

    // Verify LockScreen appears
    await expect(page.locator('text=Pennywise Locked')).toBeVisible({ timeout: 6000 });

    // Enter digits 1, 2, 3, 4 on the numeric keypad
    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('button', { name: '3', exact: true }).click();
    await page.getByRole('button', { name: '4', exact: true }).click();

    // Lock screen disappears
    await expect(page.locator('text=Pennywise Locked')).not.toBeVisible({ timeout: 6000 });
  });
});
