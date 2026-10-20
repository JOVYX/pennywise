/**
 * Security and Passcode management for Pennywise PWA.
 * Provides SHA-256 PIN hashing, rate limiting, and WebAuthn / Face ID support.
 */

const SALT = 'pennywise-secure-v1';

// In-memory security state for active session
let failedAttempts = 0;
let lockoutUntil = 0;
let lastActiveTimestamp = Date.now();

/**
 * Computes SHA-256 hash of a 4-digit PIN.
 */
export async function hashPin(pin: string, salt: string = SALT): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    try {
      const buffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(buffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }

  // Fallback hash implementation for environments without WebCrypto
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return ('0000000' + (hash >>> 0).toString(16)).slice(-8);
}

/**
 * Verifies entered PIN against stored hash.
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (isRateLimited()) {
    return false;
  }

  const computed = await hashPin(pin);
  if (computed === storedHash) {
    resetFailedAttempts();
    updateLastActive();
    return true;
  } else {
    recordFailedAttempt();
    return false;
  }
}

export function isRateLimited(): boolean {
  return Date.now() < lockoutUntil;
}

export function getRemainingLockoutSeconds(): number {
  const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
  return remaining;
}

export function recordFailedAttempt(): number {
  failedAttempts += 1;
  if (failedAttempts >= 5) {
    lockoutUntil = Date.now() + 30 * 1000; // 30 second cooldown
    failedAttempts = 0;
  }
  return failedAttempts;
}

export function resetFailedAttempts(): void {
  failedAttempts = 0;
  lockoutUntil = 0;
}

export function updateLastActive(): void {
  lastActiveTimestamp = Date.now();
}

/**
 * Checks if auto-lock duration has elapsed since last activity.
 */
export function shouldAutoLock(autoLockMinutes: number = 0): boolean {
  if (autoLockMinutes === 0) {
    // Immediate lock on background switch
    return true;
  }
  const elapsedMs = Date.now() - lastActiveTimestamp;
  const elapsedMinutes = elapsedMs / (1000 * 60);
  return elapsedMinutes >= autoLockMinutes;
}

/**
 * Checks if Biometric / Face ID authentication is available on device.
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Prompts user for Face ID / Touch ID authentication via WebAuthn.
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }

  try {
    const challenge = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(challenge);
    }

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred'
      }
    });

    if (credential) {
      updateLastActive();
      return true;
    }
  } catch {
    // User cancelled or biometric prompt dismissed
    return false;
  }

  return false;
}
