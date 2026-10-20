import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, Delete, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  verifyPin,
  isRateLimited,
  getRemainingLockoutSeconds,
  isBiometricsAvailable,
  authenticateWithBiometrics
} from '../../utils/security';

export const LockScreen: React.FC = () => {
  const { settings, updateSettings, isAppLocked, setIsAppLocked } = useApp();
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [lockoutSec, setLockoutSec] = useState<number>(0);
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(false);

  const security = settings.security;
  const isEnabled = security?.pinEnabled && Boolean(security?.pinHash);

  useEffect(() => {
    isBiometricsAvailable().then((avail) => setHasBiometrics(avail));
  }, []);

  // Countdown timer for rate limiting lockout
  useEffect(() => {
    if (!isAppLocked) return;
    const interval = setInterval(() => {
      const remaining = getRemainingLockoutSeconds();
      setLockoutSec(remaining);
      if (remaining === 0 && errorMsg.includes('locked')) {
        setErrorMsg('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isAppLocked, errorMsg]);

  // Auto-prompt biometrics once on lock screen if enabled
  useEffect(() => {
    if (isAppLocked && security?.biometricEnabled && hasBiometrics && !isRateLimited()) {
      handleBiometricUnlock();
    }
  }, [isAppLocked, security?.biometricEnabled, hasBiometrics]);

  if (!isAppLocked || !isEnabled) {
    return null;
  }

  const handleDigit = async (digit: string) => {
    if (lockoutSec > 0 || isRateLimited()) {
      setErrorMsg(`Too many attempts. Locked for ${lockoutSec || 30}s`);
      return;
    }

    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length === 4) {
      const valid = await verifyPin(newPin, security.pinHash!, async (migratedHash) => {
        await updateSettings({
          security: {
            ...security,
            pinHash: migratedHash
          }
        });
      });
      if (valid) {
        setPin('');
        setIsAppLocked(false);
      } else {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPin('');
        if (isRateLimited()) {
          setLockoutSec(getRemainingLockoutSeconds());
          setErrorMsg('Too many failed attempts. Device locked for 30 seconds.');
        } else {
          setErrorMsg('Incorrect passcode. Try again.');
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleBiometricUnlock = async () => {
    if (isRateLimited()) return;
    const success = await authenticateWithBiometrics();
    if (success) {
      setPin('');
      setIsAppLocked(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0f17] flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-200">
      {/* Top Header / Status */}
      <div className="flex flex-col items-center mt-12">
        <div className="w-14 h-14 rounded-2xl bg-[#161e2e] border border-[#1f293d] flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-400/5">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-white tracking-tight">Pennywise Locked</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">Enter your 4-digit passcode to continue</p>

        {/* 4 PIN Dots */}
        <div className={`flex items-center gap-3.5 mt-8 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const filled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  filled
                    ? 'bg-amber-400 scale-125 shadow-md shadow-amber-400/40 border border-amber-300'
                    : 'bg-[#161e2e] border border-[#1f293d]'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-4 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 font-mono animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs mb-8">
        <div className="grid grid-cols-3 gap-y-3.5 gap-x-5 text-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="w-16 h-16 mx-auto rounded-2xl bg-[#111827] active:bg-[#1f293d] border border-[#1f293d] text-2xl font-mono font-medium text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            >
              {num}
            </button>
          ))}

          {/* Biometrics or Empty */}
          <div className="flex items-center justify-center">
            {security?.biometricEnabled && hasBiometrics && (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                className="w-16 h-16 rounded-2xl bg-[#161e2e] active:bg-[#1f293d] text-amber-400 flex items-center justify-center transition-all active:scale-95 border border-[#1f293d]"
                title="Face ID / Touch ID"
              >
                <Fingerprint className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Zero */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="w-16 h-16 mx-auto rounded-2xl bg-[#111827] active:bg-[#1f293d] border border-[#1f293d] text-2xl font-mono font-medium text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
          >
            0
          </button>

          {/* Backspace */}
          <div className="flex items-center justify-center">
            {pin.length > 0 && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-16 h-16 rounded-2xl text-slate-400 active:text-white flex items-center justify-center transition-all active:scale-95"
                title="Delete"
              >
                <Delete className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
