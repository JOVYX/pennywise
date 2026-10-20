import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  db,
  initializeDatabase,
  resetAllData,
  importDatabaseFromJson,
  exportTransactionsToCsv,
  sanitizeCsvCell,
  MAX_BACKUP_SIZE_BYTES
} from '../src/db';
import {
  hashPin,
  hashLegacyPin,
  verifyPin,
  resetFailedAttempts,
  isBiometricsAvailable,
  authenticateWithBiometrics
} from '../src/utils/security';

describe('Phase 3 — Security Hardening Tests', () => {
  beforeEach(async () => {
    resetFailedAttempts();
    await resetAllData();
  });

  describe('1. CSV Formula Injection Mitigation', () => {
    it('prefixes dangerous formula initiation characters (=, +, -, @, tab, CR) with a single quote', () => {
      // Direct sanitization unit tests
      expect(sanitizeCsvCell('=HYPERLINK("http://evil.com", "Free Money")')).toBe(
        `"'=HYPERLINK(""http://evil.com"", ""Free Money"")"`
      );
      expect(sanitizeCsvCell('+cmd|"/C calc"!A0')).toBe(`"'+cmd|""/C calc""!A0"`);
      expect(sanitizeCsvCell('-2+3+cmd|"/C calc"!A0')).toBe(`"'-2+3+cmd|""/C calc""!A0"`);
      expect(sanitizeCsvCell('@SUM(1,2)')).toBe(`"'@SUM(1,2)"`);
      expect(sanitizeCsvCell('\tmaliciousTab')).toBe(`"'\tmaliciousTab"`);
      expect(sanitizeCsvCell('\rmaliciousCR')).toBe(`"'\rmaliciousCR"`);
    });

    it('leaves safe characters unchanged and escapes internal quotes', () => {
      expect(sanitizeCsvCell('Swiggy Bangalore')).toBe('"Swiggy Bangalore"');
      expect(sanitizeCsvCell('Campus "Tapri" Chai')).toBe('"Campus ""Tapri"" Chai"');
      expect(sanitizeCsvCell(15000)).toBe('"15000"');
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });

    it('sanitizes malicious merchant names inside exported CSV', async () => {
      await initializeDatabase();
      await db.transactions.put({
        id: 'tx-malicious-csv',
        type: 'expense',
        amountPaise: 45000,
        accountId: 'acc-primary-bank',
        categoryId: 'food-mess',
        merchant: '=HYPERLINK("https://phishing.site", "Phishing Link")',
        notes: '@maliciousFormula()',
        date: '2026-10-20T12:00:00Z',
        paymentMethod: 'upi',
        createdAt: '2026-10-20T12:00:00Z',
        updatedAt: '2026-10-20T12:00:00Z'
      });

      const csv = await exportTransactionsToCsv();
      expect(csv).toContain(`"'=HYPERLINK(""https://phishing.site"", ""Phishing Link"")"`);
      expect(csv).toContain(`"'@maliciousFormula()"`);
      expect(csv).not.toContain(`,"=HYPERLINK`);
    });
  });

  describe('2. Strict Zod Schema & Atomic Restore from Backup', () => {
    it('rejects oversized backup files exceeding 20 MB', async () => {
      // Simulate file size > 20 MB
      const oversizedString = ' '.repeat(MAX_BACKUP_SIZE_BYTES + 10);
      const res = await importDatabaseFromJson(oversizedString);
      expect(res.success).toBe(false);
      expect(res.message).toContain('20 MB');
    });

    it('rejects malformed non-JSON files', async () => {
      const res = await importDatabaseFromJson('{"app": "Pennywise", brokenJson');
      expect(res.success).toBe(false);
      expect(res.message).toContain('Malformed JSON');
    });

    it('rejects unsupported schema versions with a clear error', async () => {
      const wrongVersionJson = JSON.stringify({
        app: 'Pennywise',
        version: 99,
        data: {
          accounts: [],
          categories: [],
          transactions: []
        }
      });
      const res = await importDatabaseFromJson(wrongVersionJson);
      expect(res.success).toBe(false);
      expect(res.message).toContain('Unsupported backup version: 99');
    });

    it('rejects backups with invalid data types or missing required tables', async () => {
      const invalidData = JSON.stringify({
        app: 'Pennywise',
        version: 1,
        data: {
          accounts: 'not-an-array',
          transactions: []
        }
      });
      const res = await importDatabaseFromJson(invalidData);
      expect(res.success).toBe(false);
      expect(res.message).toContain('Invalid backup schema');
    });

    it('preserves existing data atomically if validation or restore fails', async () => {
      await initializeDatabase();
      const existingAccount = {
        id: 'acc-pre-existing',
        name: 'Safe Bank Account',
        type: 'bank' as const,
        openingBalancePaise: 500000,
        color: '#3b82f6',
        icon: 'Landmark',
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-20T10:00:00Z'
      };
      await db.accounts.put(existingAccount);

      // Attempt to import a file with a corrupt schema item
      const corruptBackup = JSON.stringify({
        app: 'Pennywise',
        version: 1,
        data: {
          accounts: [
            {
              id: 'acc-invalid',
              name: 12345 // invalid: name should be string
            }
          ],
          categories: [],
          transactions: []
        }
      });

      const res = await importDatabaseFromJson(corruptBackup);
      expect(res.success).toBe(false);

      // Ensure pre-existing account is preserved (atomic - no partial state)
      const accountsInDb = await db.accounts.toArray();
      const found = accountsInDb.find((a) => a.id === 'acc-pre-existing');
      expect(found).toBeDefined();
    });
  });

  describe('3. App Lock PBKDF2 WebCrypto Hashing & Transparent Migration', () => {
    it('hashes PIN using PBKDF2 with 100,000 iterations and random salt', async () => {
      const hash1 = await hashPin('4321');
      const hash2 = await hashPin('4321');

      expect(hash1).toMatch(/^pbkdf2:100000:[0-9a-f]{32}:[0-9a-f]{64}$/);
      expect(hash2).toMatch(/^pbkdf2:100000:[0-9a-f]{32}:[0-9a-f]{64}$/);
      // Random per-install salt guarantees different ciphertext for same PIN
      expect(hash1).not.toBe(hash2);

      // But both verify correctly
      expect(await verifyPin('4321', hash1)).toBe(true);
      expect(await verifyPin('4321', hash2)).toBe(true);
      expect(await verifyPin('0000', hash1)).toBe(false);
    });

    it('transparently migrates legacy SHA-256 PIN hashes on successful unlock', async () => {
      const pin = '1357';
      const legacyHash = await hashLegacyPin(pin);
      expect(legacyHash).not.toContain('pbkdf2:');

      // Verify and migrate
      let migratedHashResult = '';
      const valid = await verifyPin(pin, legacyHash, async (newHash) => {
        migratedHashResult = newHash;
      });

      expect(valid).toBe(true);
      expect(migratedHashResult).toMatch(/^pbkdf2:100000:[0-9a-f]{32}:[0-9a-f]{64}$/);

      // The new migrated hash should now verify the PIN
      const verifyWithNew = await verifyPin(pin, migratedHashResult);
      expect(verifyWithNew).toBe(true);
    });

    it('rejects incorrect PIN for legacy hashes without migrating', async () => {
      const legacyHash = await hashLegacyPin('1357');
      let migrationCalled = false;
      const valid = await verifyPin('9999', legacyHash, async () => {
        migrationCalled = true;
      });

      expect(valid).toBe(false);
      expect(migrationCalled).toBe(false);
    });
  });

  describe('4. Graceful WebAuthn Degradation', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns false for biometrics when window.isSecureContext is false (e.g. http://192.168.x.x)', async () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        writable: true,
        configurable: true
      });

      const isAvail = await isBiometricsAvailable();
      expect(isAvail).toBe(false);

      const authResult = await authenticateWithBiometrics();
      expect(authResult).toBe(false);
    });

    it('never throws unhandled errors if PublicKeyCredential fails or throws', async () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockRejectedValue(new Error('Device error'))
        },
        writable: true,
        configurable: true
      });

      const isAvail = await isBiometricsAvailable();
      expect(isAvail).toBe(false);
    });
  });
});
