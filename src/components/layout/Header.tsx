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
    <header className="sticky top-0 z-30 bg-neutral-950/85 backdrop-blur-xl border-b border-neutral-800/60 px-4 pt-3 pb-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <span className="text-neutral-950 font-black text-sm tracking-tighter">₹</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              Pennywise
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PWA
              </span>
            </h1>
          </div>
        </div>

        {/* Month Navigation Control */}
        <div className="flex items-center space-x-1 bg-neutral-900 border border-neutral-800/80 rounded-xl p-1 shadow-inner">
          <button
            id="btn-prev-month"
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-95 transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            id="btn-current-month"
            type="button"
            onClick={() => setCurrentMonth(getCurrentMonthKey())}
            className={`flex items-center space-x-1 px-2 py-0.5 text-xs font-semibold rounded-lg transition-all ${
              isCurrentMonth
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>{formatMonthName(currentMonth)}</span>
          </button>

          <button
            id="btn-next-month"
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-95 transition-all"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
