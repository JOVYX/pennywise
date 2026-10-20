import React, { useState } from 'react';
import { ShieldAlert, Download, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportDatabaseToJson } from '../../db';
import { downloadOrShareFile } from '../../utils/fileExport';
import { formatBackupAge } from '../../utils/formatters';

export const BackupWarningBanner: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const lastBackup = settings.lastBackupDate;
  const isOverdue = !lastBackup || (Date.now() - new Date(lastBackup).getTime()) >= 7 * 24 * 60 * 60 * 1000;

  if (!isOverdue || isDismissed) {
    return null;
  }

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const json = await exportDatabaseToJson();
      const filename = `pennywise-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([json], { type: 'application/json' });
      await downloadOrShareFile({
        blob,
        filename,
        mimeType: 'application/json'
      });
      await updateSettings({ lastBackupDate: new Date().toISOString() });
    } catch {
      // Gracefully handle cancellation
    } finally {
      setIsExporting(false);
    }
  };

  const backupText = lastBackup ? `Last backup was ${formatBackupAge(lastBackup)}.` : 'No backup has been created yet.';

  return (
    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 animate-in fade-in duration-150">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300">
                Backup Recommended
              </span>
              <span className="mono text-[10px] text-amber-400/80 font-semibold px-1.5 py-0.2 rounded bg-amber-400/10 border border-amber-400/20">
                {lastBackup ? '7+ Days' : 'Never'}
              </span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Pennywise stores data purely on this device. {backupText} Export a JSON backup to Files or iCloud to prevent Safari eviction.
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Dismiss backup warning"
          onClick={() => setIsDismissed(true)}
          className="text-amber-400/70 hover:text-amber-300 p-0.5 rounded transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2.5 pl-7 flex items-center gap-2">
        <button
          type="button"
          disabled={isExporting}
          onClick={handleExportBackup}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Exporting...' : 'Export JSON Backup'}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          Remind Later
        </button>
      </div>
    </div>
  );
};
