import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPin,
  verifyPin,
  resetFailedAttempts,
  isRateLimited,
  getRemainingLockoutSeconds,
  shouldAutoLock
} from '../src/utils/security';

describe('App Security & PIN Lock', () => {
  beforeEach(() => {
    resetFailedAttempts();
  });

  it('generates consistent SHA-256 hash for identical PINs', async () => {
    const hash1 = await hashPin('1234');
    const hash2 = await hashPin('1234');
    const hashOther = await hashPin('4321');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashOther);
  });

  it('verifies correct PIN successfully', async () => {
    const storedHash = await hashPin('2580');
    const isSuccess = await verifyPin('2580', storedHash);
    expect(isSuccess).toBe(true);
  });

  it('rejects incorrect PIN and records failed attempt', async () => {
    const storedHash = await hashPin('2580');
    const isSuccess = await verifyPin('1111', storedHash);
    expect(isSuccess).toBe(false);
  });

  it('enforces lockout after 5 consecutive failed attempts', async () => {
    const storedHash = await hashPin('9999');
    for (let i = 0; i < 4; i++) {
      await verifyPin('0000', storedHash);
      expect(isRateLimited()).toBe(false);
    }

    // 5th failed attempt triggers lockout
    await verifyPin('0000', storedHash);
    expect(isRateLimited()).toBe(true);
    expect(getRemainingLockoutSeconds()).toBeGreaterThan(0);

    // Any attempt during lockout fails immediately
    const duringLockout = await verifyPin('9999', storedHash);
    expect(duringLockout).toBe(false);
  });

  it('computes auto-lock triggers', () => {
    // 0 minutes means immediate lock on backgrounding
    expect(shouldAutoLock(0)).toBe(true);
  });
});
