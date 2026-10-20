import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Check,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import {
  fileToMatrix,
  parseStatementMatrix,
  parseCsvText,
  StatementParseResult
} from '../../utils/statementParser';
import { formatINR } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';

// Sample demonstration statements for instant testing
const SAMPLE_SBI_CSV = `Account Name : MR. ARJUN SHARMA
Account Number : 00000039201920392
Branch : KORAMANGALA BANGALORE
Date,Txn Date,Value Date,Description,Ref No./Cheque No.,Branch Code,Debit,Credit,Balance
1,20-Oct-2026,20-Oct-2026,TRANSFER TO 49202394024 / UPI / 204929492 / SWIGGY BANGALORE,UPI/204929492,002,340.00,,42000.00
2,19-Oct-2026,19-Oct-2026,TRANSFER TO 99201929381 / UPI / 391029381 / CAMPUS TAPRI CHAI,UPI/391029381,002,60.00,,42340.00
3,18-Oct-2026,18-Oct-2026,TRANSFER TO 50192839102 / UPI / 591029382 / BLINKIT COMMERCE,UPI/591029382,002,485.50,,42400.00
4,16-Oct-2026,16-Oct-2026,BY TRANSFER-NEFT*TECH LABS*STIPEND OCTOBER,NEFT778899,002,,18000.00,42885.50
5,15-Oct-2026,15-Oct-2026,TRANSFER TO 10293849102 / UPI / 901928381 / RAPIDO BIKE TAXI,UPI/901928381,002,95.00,,24885.50
6,14-Oct-2026,14-Oct-2026,ACH D- BESCOM ELECTRICITY BILL BANGALORE,ACH392019,002,1250.00,,24980.50
7,12-Oct-2026,12-Oct-2026,POS 401249XXXXXX1234 ZE univers BOOKS STATIONERY,POS991283,002,620.00,,26230.50`;

const SAMPLE_HDFC_CSV = `HDFC BANK LIMITED
STATEMENT OF ACCOUNT NO: 50100492819283
Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
20/10/26,UPI-SWIGGY-swiggy@icici-123456789012,123456789012,20/10/26,420.00,,18500.00
19/10/26,UPI-ZOMATO-zomato@hdfc-998877665544,998877665544,19/10/26,280.00,,18920.00
17/10/26,ACH C- TECH INNOVATIONS INTERNSHIP,ACH90218,17/10/26,,15000.00,19200.00
15/10/26,POS 401249XXXXXX1234 APOLLO PHARMACY,POS443322,15/10/26,380.00,,4200.00
12/10/26,UPI-NETFLIX-netflix@billpe-556677889900,556677889900,12/10/26,199.00,,4580.00`;

export const BankStatementModal: React.FC = () => {
  const {
    isImportStatementOpen,
    setIsImportStatementOpen,
    accounts,
    categories,
    transactions: existingTransactions,
    bulkImportTransactions
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<StatementParseResult | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || 'acc-sbi');
  const [filterMode, setFilterMode] = useState<'all' | 'new'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  if (!isImportStatementOpen) return null;

  const handleClose = () => {
    setIsImportStatementOpen(false);
    setParseResult(null);
    setFileName('');
    setImportSuccessMessage(null);
  };

  const handleFile = async (file: File) => {
    try {
      setIsProcessing(true);
      setFileName(file.name);
      setImportSuccessMessage(null);

      const matrix = await fileToMatrix(file);
      const result = parseStatementMatrix(matrix, existingTransactions, categories);
      setParseResult(result);

      // Attempt to auto-select matching account if detected
      if (result.detectedBank === 'sbi') {
        const sbiAcc = accounts.find((a) => a.name.toLowerCase().includes('sbi') || a.name.toLowerCase().includes('state bank'));
        if (sbiAcc) setSelectedAccountId(sbiAcc.id);
      } else if (result.detectedBank === 'hdfc') {
        const hdfcAcc = accounts.find((a) => a.name.toLowerCase().includes('hdfc'));
        if (hdfcAcc) setSelectedAccountId(hdfcAcc.id);
      } else if (result.detectedBank === 'icici') {
        const iciciAcc = accounts.find((a) => a.name.toLowerCase().includes('icici'));
        if (iciciAcc) setSelectedAccountId(iciciAcc.id);
      }
    } catch (err: any) {
      alert(`Error reading file: ${err?.message || 'Unsupported format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = (type: 'sbi' | 'hdfc') => {
    setIsProcessing(true);
    setImportSuccessMessage(null);
    const sampleText = type === 'sbi' ? SAMPLE_SBI_CSV : SAMPLE_HDFC_CSV;
    setFileName(type === 'sbi' ? 'SBI_Savings_Statement_Sample.csv' : 'HDFC_Account_Statement_Sample.csv');

    const matrix = parseCsvText(sampleText);
    const result = parseStatementMatrix(matrix, existingTransactions, categories);
    setParseResult(result);

    if (type === 'sbi') {
      const sbiAcc = accounts.find((a) => a.name.toLowerCase().includes('sbi') || a.name.toLowerCase().includes('state bank'));
      if (sbiAcc) setSelectedAccountId(sbiAcc.id);
    } else {
      const hdfcAcc = accounts.find((a) => a.name.toLowerCase().includes('hdfc'));
      if (hdfcAcc) setSelectedAccountId(hdfcAcc.id);
    }
    setIsProcessing(false);
  };

  const toggleSelectTransaction = (id: string) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      transactions: parseResult.transactions.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    });
  };

  const setSelectAll = (select: boolean) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      transactions: parseResult.transactions.map((t) => {
        if (select) {
          return { ...t, selected: !t.isDuplicate };
        }
        return { ...t, selected: false };
      })
    });
  };

  const handleCategoryChange = (txId: string, categoryId: string) => {
    if (!parseResult) return;
    setParseResult({
      ...parseResult,
      transactions: parseResult.transactions.map((t) => (t.id === txId ? { ...t, categoryId } : t))
    });
  };

  const handleImportSubmit = async () => {
    if (!parseResult) return;
    const selectedTxs = parseResult.transactions.filter((t) => t.selected);
    if (selectedTxs.length === 0) return;

    setIsProcessing(true);
    try {
      const payload = selectedTxs.map((t) => ({
        amountPaise: t.amountPaise,
        type: t.type,
        merchant: t.merchant,
        categoryId: t.categoryId,
        accountId: selectedAccountId,
        paymentMethod: t.paymentMethod,
        date: t.date,
        notes: `Imported from ${parseResult.bankDisplayName} • ${t.narration}`
      }));

      const count = await bulkImportTransactions(payload);

      if (typeof window !== 'undefined' && Boolean(document.createElement('canvas').getContext?.('2d'))) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {
          // Safe fallback in non-canvas test environments
        }
      }

      setImportSuccessMessage(`Successfully imported ${count} transactions into ${accounts.find((a) => a.id === selectedAccountId)?.name || 'account'}!`);

      setTimeout(() => {
        handleClose();
      }, 1400);
    } catch (err: any) {
      alert(`Failed to import transactions: ${err?.message || 'Database error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = parseResult ? parseResult.transactions.filter((t) => t.selected).length : 0;
  const filteredTxs = parseResult
    ? parseResult.transactions.filter((t) => (filterMode === 'new' ? !t.isDuplicate : true))
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stmt-modal-title"
    >
      <div
        className="w-full max-w-xl bg-[#111827] border-t sm:border border-[#1f293d] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-250"
      >
        {/* iOS Grab Handle for Mobile */}
        <div className="w-9 h-1 rounded-full bg-slate-700 mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f293d] bg-[#111827]/95 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#161e2e] border border-[#1f293d] flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 id="stmt-modal-title" className="text-sm font-semibold text-white tracking-tight">
                Import Bank Statement
              </h2>
              <p className="text-[11px] text-slate-400">
                SBI, HDFC, ICICI, Axis & universal CSV / Excel spreadsheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-lg bg-[#161e2e] border border-[#1f293d] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {importSuccessMessage ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">{importSuccessMessage}</h3>
              <p className="text-xs text-slate-400 font-mono">Updating balances and ledger records...</p>
            </div>
          ) : !parseResult ? (
            /* STEP 1: Upload Dropzone */
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-500/[0.04]'
                    : 'border-[#1f293d] hover:border-slate-600 bg-[#0b0f17] hover:bg-[#161e2e]/40'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-[#161e2e] border border-[#1f293d] flex items-center justify-center mx-auto mb-3 text-slate-300">
                  <UploadCloud className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-xs font-semibold text-white mb-1">
                  Click to select or drag & drop statement
                </h3>
                <p className="text-[11px] text-slate-400 mb-3 max-w-sm mx-auto">
                  Export your e-statement from netbanking or mobile app as CSV or Excel.
                </p>

                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'CSV / Excel'].map((bank) => (
                    <span
                      key={bank}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#161e2e] text-slate-300 border border-[#1f293d]"
                    >
                      {bank}
                    </span>
                  ))}
                </div>
              </div>

              {/* Privacy Guarantee Banner */}
              <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="leading-snug">
                  <strong>100% Private & Local:</strong> Your bank statement is processed entirely within your device's browser memory. Zero files or statements are uploaded to any server.
                </span>
              </div>

              {/* Instant Demo Sandbox */}
              <div className="pt-2">
                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Or test immediately with student sample data:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadSample('sbi')}
                    className="flex items-center justify-center space-x-2 bg-[#161e2e] hover:bg-[#1f293d] border border-[#1f293d] rounded-xl px-3 py-2.5 text-xs font-mono font-medium text-slate-200 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Try Sample SBI CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('hdfc')}
                    className="flex items-center justify-center space-x-2 bg-[#161e2e] hover:bg-[#1f293d] border border-[#1f293d] rounded-xl px-3 py-2.5 text-xs font-mono font-medium text-slate-200 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Try Sample HDFC CSV</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: Reconciliation & Review */
            <div className="space-y-4">
              {/* Statement Overview Card */}
              <div className="bg-[#0b0f17] border border-[#1f293d] rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#161e2e] border border-[#1f293d] flex items-center justify-center text-white shrink-0">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">
                        {parseResult.bankDisplayName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#161e2e] text-slate-300 font-mono border border-[#1f293d]">
                        {parseResult.detectedBank.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-[220px] font-mono">
                      {fileName} {parseResult.accountNumberHint && `• A/C ${parseResult.accountNumberHint}`}
                    </p>
                  </div>
                </div>

                {/* Target Account Selector */}
                <div className="w-full sm:w-auto flex items-center space-x-1.5 bg-[#161e2e] border border-[#1f293d] rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-slate-400 text-[11px] font-mono">Destination:</span>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-[#111827] text-white">
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#0b0f17] border border-[#1f293d] rounded-xl p-2.5">
                  <span className="text-base font-bold text-white font-mono tabular-nums">{parseResult.totalParsed}</span>
                  <p className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Total Rows</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5">
                  <span className="text-base font-bold text-emerald-400 font-mono tabular-nums">{parseResult.newCount}</span>
                  <p className="text-[9px] font-mono uppercase tracking-wider text-emerald-400/90 font-semibold mt-0.5">New Ready</p>
                </div>
                <div className="bg-[#0b0f17] border border-[#1f293d] rounded-xl p-2.5">
                  <span className="text-base font-bold text-slate-400 font-mono tabular-nums">{parseResult.duplicateCount}</span>
                  <p className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Duplicates</p>
                </div>
              </div>

              {/* Table Action Controls */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-1 bg-[#0b0f17] border border-[#1f293d] p-0.5 rounded-lg text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      filterMode === 'all' ? 'bg-[#161e2e] text-white border border-[#1f293d] font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({parseResult.transactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('new')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      filterMode === 'new' ? 'bg-[#161e2e] text-white border border-[#1f293d] font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    New Only ({parseResult.newCount})
                  </button>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setSelectAll(true)}
                    className="text-emerald-400 hover:underline font-semibold text-[11px]"
                  >
                    Select All New
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectAll(false)}
                    className="text-slate-400 hover:text-white transition-colors text-[11px]"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Transactions Review List */}
              <div className="bg-[#0b0f17] border border-[#1f293d] rounded-xl divide-y divide-[#1f293d] max-h-64 overflow-y-auto">
                {filteredTxs.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-slate-400">
                    No transactions match current filter.
                  </div>
                ) : (
                  filteredTxs.map((tx) => {
                    const cat = categories.find((c) => c.id === tx.categoryId);
                    return (
                      <div
                        key={tx.id}
                        onClick={() => toggleSelectTransaction(tx.id)}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          tx.selected ? 'bg-[#161e2e]/40 hover:bg-[#161e2e]/70' : 'opacity-40 hover:opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              tx.selected ? 'bg-amber-400 border-amber-400 text-black' : 'border-slate-700 bg-[#0b0f17]'
                            }`}
                          >
                            {tx.selected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-white truncate max-w-[170px] sm:max-w-[220px]">
                                {tx.merchant}
                              </span>
                              {tx.isDuplicate ? (
                                <span className="text-[9px] font-mono font-medium uppercase px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 shrink-0">
                                  Duplicate
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono font-medium uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                                  New
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span className="font-mono tabular-nums">
                                {new Date(tx.date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short'
                                })}
                              </span>
                              <span>•</span>
                              <span className="truncate max-w-[140px] text-slate-500 font-mono">{tx.narration}</span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Category Badge */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-mono font-semibold tabular-nums block ${
                              tx.type === 'income' ? 'text-emerald-400' : 'text-white'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatINR(tx.amountPaise, { showPaise: false })}
                          </span>

                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center space-x-1 mt-0.5"
                          >
                            {cat && <CategoryIcon name={cat.icon} size={10} color={cat.color} />}
                            <select
                              value={tx.categoryId}
                              onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                              className="text-[9px] bg-transparent text-slate-400 hover:text-slate-200 cursor-pointer focus:outline-none"
                            >
                              {categories
                                .filter((c) => c.type === tx.type)
                                .map((c) => (
                                  <option key={c.id} value={c.id} className="bg-[#111827] text-white">
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {parseResult.duplicateCount > 0 && (
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-[#0b0f17] border border-[#1f293d] rounded-xl px-3 py-2 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    {parseResult.duplicateCount} transactions already exist in Pennywise and have been unselected to protect against duplicate records.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1f293d] bg-[#111827] flex items-center justify-between">
          {parseResult ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setParseResult(null);
                  setFileName('');
                }}
                className="flex items-center space-x-1.5 text-xs font-mono font-medium text-slate-400 hover:text-white px-3 py-2 rounded-xl transition-colors bg-[#161e2e] border border-[#1f293d]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Pick Another</span>
              </button>

              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={selectedCount === 0 || isProcessing}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  selectedCount > 0 && !isProcessing
                    ? 'bg-amber-400 text-black hover:bg-amber-300 active:scale-95 shadow-md'
                    : 'bg-[#161e2e] text-slate-500 border border-[#1f293d] cursor-not-allowed'
                }`}
              >
                {isProcessing
                  ? 'Importing...'
                  : selectedCount > 0
                  ? `Import ${selectedCount} Transactions`
                  : 'Select Transactions'}
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-400 hover:text-white transition-colors bg-[#161e2e] border border-[#1f293d]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
