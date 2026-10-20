import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatMonthName, getCurrentMonthKey } from '../../utils/formatters';

export const Header: React.FC = () => {
  const { currentMonth, setCurrentMonth } = useApp();

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const newMonth = (date.getMonth() + 1).toString().padStart(2, '0');
    setCurrentMonth(`${date.getFullYear()}-${newMonth}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const newMonth = (date.getMonth() + 1).toString().padStart(2, '0');
    setCurrentMonth(`${date.getFullYear()}-${newMonth}`);
  };

  const isCurrentMonth = currentMonth === getCurrentMonthKey();

  return (
    <header className="sticky top-0 z-30 bg-[#0b0f17]/95 backdrop-blur-md border-b border-[#1f293d] px-4 pt-3 pb-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand & Mode Indicator */}
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#161e2e] border border-[#28354b] flex items-center justify-center shadow-inner">
            <span className="mono text-amber-400 font-bold text-xs">₹</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-white tracking-tight">
                Pennywise
              </h1>
              <span className="mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#161e2e] text-emerald-400 border border-[#28354b] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                VAULT
              </span>
            </div>
          </div>
        </div>

        {/* Month Navigation Control */}
        <div className="flex items-center space-x-0.5 bg-[#111827] border border-[#1f293d] rounded-lg p-0.5 shadow-sm">
          <button
            id="btn-prev-month"
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#161e2e] active:scale-95 transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-current-month"
            type="button"
            onClick={() => setCurrentMonth(getCurrentMonthKey())}
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-all ${
              isCurrentMonth
                ? 'text-amber-400 bg-amber-500/10 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#161e2e]'
            }`}
          >
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="mono tracking-tight">{formatMonthName(currentMonth)}</span>
          </button>

          <button
            id="btn-next-month"
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#161e2e] active:scale-95 transition-all"
            aria-label="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
