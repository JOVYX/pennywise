/**
 * Security and Passcode Management for Pennywise PWA.
 *
 * PRIVACY SCREEN NOTICE:
 * App Lock functions as a client-side UI privacy screen to deter casual shoulder-surfing.
 * It does NOT cryptographically encrypt the underlying IndexedDB database on device storage.
 */

export const PBKDF2_ITERATIONS = 100000;
const LEGACY_SALT = 'pennywise-secure-v1';

// In-memory security state for rate limiting
let failedAttempts = 0;
let lockoutUntil = 0;
let lastActiveTimestamp = Date.now();

/**
 * Computes legacy SHA-256 hash for backwards compatibility with pre-Phase 3 PINs.
 */
export async function hashLegacyPin(pin: string, salt: string = LEGACY_SALT): Promise<string> {
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

  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return ('0000000' + (hash >>> 0).toString(16)).slice(-8);
}

/**
 * Derives a PBKDF2 key hex string using WebCrypto with SHA-256 and high iteration count.
 */
async function derivePbkdf2Hex(pin: string, saltBytes: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.importKey && crypto.subtle.deriveBits) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes.buffer,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback if WebCrypto is unavailable
  return hashLegacyPin(pin, Array.from(saltBytes).map((b) => b.toString(16)).join(''));
}

/**
 * Hashes a 4-digit PIN using PBKDF2 with WebCrypto, 100,000 iterations, and a cryptographically random 16-byte salt.
 * Output format: `pbkdf2:<iterations>:<saltHex>:<hashHex>`
 */
export async function hashPin(pin: string, customSaltHex?: string): Promise<string> {
  let saltBytes: Uint8Array<ArrayBuffer>;
  if (customSaltHex) {
    const matches = customSaltHex.match(/.{1,2}/g) || [];
    const buf = new ArrayBuffer(matches.length);
    saltBytes = new Uint8Array(buf);
    matches.forEach((byte, idx) => {
      saltBytes[idx] = parseInt(byte, 16);
    });
  } else {
    const buf = new ArrayBuffer(16);
    saltBytes = new Uint8Array(buf);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(saltBytes);
    } else {
      for (let i = 0; i < 16; i++) saltBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const derivedHashHex = await derivePbkdf2Hex(pin, saltBytes, PBKDF2_ITERATIONS);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${derivedHashHex}`;
}

export interface VerifyResult {
  valid: boolean;
  migratedHash?: string;
}

/**
 * Verifies entered PIN against stored hash.
 * If the stored hash is a legacy SHA-256 hash, it verifies and returns a migrated PBKDF2 hash.
 */
export async function verifyAndMigratePin(pin: string, storedHash: string): Promise<VerifyResult> {
  if (isRateLimited()) {
    return { valid: false };
  }

  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const saltHex = parts[2];
      const expectedHashHex = parts[3];

      const matches = saltHex.match(/.{1,2}/g) || [];
      const saltBytes = new Uint8Array(matches.map((b) => parseInt(b, 16)));
      const candidateHashHex = await derivePbkdf2Hex(pin, saltBytes, iterations);

      if (candidateHashHex === expectedHashHex) {
        resetFailedAttempts();
        updateLastActive();
        return { valid: true };
      }
    }
  } else {
    // Legacy SHA-256 verification with automatic migration to PBKDF2
    const legacyComputed = await hashLegacyPin(pin);
    if (legacyComputed === storedHash) {
      resetFailedAttempts();
      updateLastActive();
      const newPbkdf2Hash = await hashPin(pin);
      return { valid: true, migratedHash: newPbkdf2Hash };
    }
  }

  recordFailedAttempt();
  return { valid: false };
}

/**
 * Standard verifyPin with optional migration callback for transparent upgrade.
 */
export async function verifyPin(
  pin: string,
  storedHash: string,
  onMigrate?: (newHash: string) => Promise<void> | void
): Promise<boolean> {
  const result = await verifyAndMigratePin(pin, storedHash);
  if (result.valid) {
    if (result.migratedHash && onMigrate) {
      try {
        await onMigrate(result.migratedHash);
      } catch {
        // Migration save failed non-fatally
      }
    }
    return true;
  }
  return false;
}

export function isRateLimited(): boolean {
  return Date.now() < lockoutUntil;
}

export function getRemainingLockoutSeconds(): number {
  return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
}

export function recordFailedAttempt(): number {
  failedAttempts += 1;
  if (failedAttempts >= 5) {
    lockoutUntil = Date.now() + 30 * 1000; // 30-second cooldown
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
    return true;
  }
  const elapsedMs = Date.now() - lastActiveTimestamp;
  const elapsedMinutes = elapsedMs / (1000 * 60);
  return elapsedMinutes >= autoLockMinutes;
}

/**
 * Checks if Biometric / Face ID authentication is available on device.
 * Gracefully returns false in non-secure contexts (e.g. http://192.168.x.x) or when unsupported.
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // WebAuthn strictly requires a secure context (HTTPS or localhost)
  if (window.isSecureContext === false) {
    return false;
  }

  try {
    if (
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Prompts user for Face ID / Touch ID authentication via WebAuthn.
 * Gracefully returns false without throwing in non-secure contexts or when dismissed.
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    window.isSecureContext === false ||
    typeof window.PublicKeyCredential === 'undefined' ||
    typeof navigator === 'undefined' ||
    !navigator.credentials
  ) {
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
