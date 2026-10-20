import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { formatBackupAge } from '../src/utils/formatters';
import { downloadOrShareFile } from '../src/utils/fileExport';
import { requestStoragePersistence, checkStoragePersistence } from '../src/utils/storage';
import { BackupWarningBanner } from '../src/components/dashboard/BackupWarningBanner';
import { AppProvider } from '../src/context/AppContext';
import { resetAllData, db } from '../src/db';
import { OnboardingModal } from '../src/components/onboarding/OnboardingModal';
import { AppSettings } from '../src/types';

describe('Phase 2 — iOS Data Safety & Persistence', () => {
  beforeEach(async () => {
    await resetAllData();
  });

  describe('formatBackupAge helper', () => {
    it('returns "Never" for empty or invalid dates', () => {
      expect(formatBackupAge()).toBe('Never');
      expect(formatBackupAge(undefined)).toBe('Never');
      expect(formatBackupAge('invalid-date')).toBe('Never');
    });

    it('returns "Today" for dates created on the same day', () => {
      const now = new Date('2026-10-20T12:00:00Z').getTime();
      const todayISO = new Date('2026-10-20T08:00:00Z').toISOString();
      expect(formatBackupAge(todayISO, now)).toBe('Today');
    });

    it('returns "Yesterday" for dates created 1 day ago', () => {
      const now = new Date('2026-10-20T12:00:00Z').getTime();
      const yesterdayISO = new Date('2026-10-19T10:00:00Z').toISOString();
      expect(formatBackupAge(yesterdayISO, now)).toBe('Yesterday');
    });

    it('returns "X days ago" for older backups', () => {
      const now = new Date('2026-10-20T12:00:00Z').getTime();
      const eightDaysAgoISO = new Date('2026-10-12T10:00:00Z').toISOString();
      expect(formatBackupAge(eightDaysAgoISO, now)).toBe('8 days ago');
    });
  });

  describe('Storage persistence helpers', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('calls navigator.storage.persist if available', async () => {
      const persistMock = vi.fn().mockResolvedValue(true);
      Object.defineProperty(navigator, 'storage', {
        value: { persist: persistMock },
        writable: true,
        configurable: true
      });

      const res = await requestStoragePersistence();
      expect(persistMock).toHaveBeenCalled();
      expect(res).toBe(true);
    });

    it('calls navigator.storage.persisted if available', async () => {
      const persistedMock = vi.fn().mockResolvedValue(false);
      Object.defineProperty(navigator, 'storage', {
        value: { persisted: persistedMock },
        writable: true,
        configurable: true
      });

      const res = await checkStoragePersistence();
      expect(persistedMock).toHaveBeenCalled();
      expect(res).toBe(false);
    });
  });

  describe('Reliable file export in iOS standalone mode', () => {
    it('prefers navigator.share with files when canShare is supported', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      const canShareMock = vi.fn().mockReturnValue(true);

      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        writable: true,
        configurable: true
      });
      Object.defineProperty(navigator, 'canShare', {
        value: canShareMock,
        writable: true,
        configurable: true
      });

      const blob = new Blob(['{"test": true}'], { type: 'application/json' });
      await downloadOrShareFile({
        blob,
        filename: 'backup.json',
        mimeType: 'application/json'
      });

      expect(canShareMock).toHaveBeenCalled();
      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'backup.json',
          files: expect.any(Array)
        })
      );
    });

    it('falls back to anchor download when canShare is not supported', async () => {
      Object.defineProperty(navigator, 'canShare', {
        value: () => false,
        writable: true,
        configurable: true
      });

      const clickMock = vi.fn();
      const appendMock = vi.spyOn(document.body, 'appendChild');
      const createElementOrig = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = createElementOrig(tagName);
        if (tagName === 'a') {
          el.click = clickMock;
        }
        return el;
      });

      const blob = new Blob(['csv,content'], { type: 'text/csv' });
      await downloadOrShareFile({
        blob,
        filename: 'export.csv',
        mimeType: 'text/csv'
      });

      expect(clickMock).toHaveBeenCalled();
      appendMock.mockRestore();
    });
  });

  describe('BackupWarningBanner Component', () => {
    it('renders on the dashboard when there has been no backup yet', async () => {
      render(
        <AppProvider>
          <BackupWarningBanner />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Backup Recommended/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Export JSON Backup/i)).toBeInTheDocument();
    });

    it('can be dismissed with the X button', async () => {
      render(
        <AppProvider>
          <BackupWarningBanner />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Backup Recommended/i)).toBeInTheDocument();
      });

      const dismissBtn = screen.getByRole('button', { name: /dismiss backup warning/i });
      fireEvent.click(dismissBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Backup Recommended/i)).not.toBeInTheDocument();
      });
    });

    it('does not render when backup is recent (< 7 days ago)', async () => {
      // Put recent backup date in settings
      const settings = (await db.settings.get('app_settings'))?.value as AppSettings | undefined;
      if (settings) {
        settings.lastBackupDate = new Date().toISOString();
        await db.settings.put({ key: 'app_settings', value: settings });
      }

      render(
        <AppProvider>
          <BackupWarningBanner />
        </AppProvider>
      );

      // Should not show banner
      await waitFor(() => {
        expect(screen.queryByText(/Backup Recommended/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('OnboardingModal First-Run Note', () => {
    it('shows note explaining Home Screen creates a separate storage partition from Safari', async () => {
      render(
        <AppProvider>
          <OnboardingModal />
        </AppProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/iPhone Home Screen Note/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/creates an isolated storage area separate from Safari/i)).toBeInTheDocument();
      expect(screen.getByText(/Restore from Backup/i)).toBeInTheDocument();
    });
  });
});
