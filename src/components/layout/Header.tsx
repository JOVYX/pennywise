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
    <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-2xl border-b border-white/[0.07] px-4 pt-3 pb-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center shadow-inner">
            <span className="text-emerald-400 font-bold text-xs tracking-tight">₹</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              Pennywise
              <span className="text-[9px] font-medium tracking-wide uppercase px-1.5 py-0.2 rounded-md bg-white/[0.06] text-zinc-400 border border-white/[0.06]">
                Vault
              </span>
            </h1>
          </div>
        </div>

        {/* Month Navigation Control */}
        <div className="flex items-center space-x-0.5 bg-zinc-900/90 border border-white/[0.08] rounded-xl p-0.5 shadow-sm">
          <button
            id="btn-prev-month"
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-zinc-400 hover:text-white active:bg-white/10 transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-current-month"
            type="button"
            onClick={() => setCurrentMonth(getCurrentMonthKey())}
            className={`flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
              isCurrentMonth
                ? 'text-emerald-400 bg-emerald-500/10 font-semibold'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3 text-zinc-400" />
            <span>{formatMonthName(currentMonth)}</span>
          </button>

          <button
            id="btn-next-month"
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-zinc-400 hover:text-white active:bg-white/10 transition-all"
            aria-label="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
