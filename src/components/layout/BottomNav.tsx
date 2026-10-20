import React from 'react';
import { Home, ReceiptText, PieChart, TrendingUp, Settings2, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { selectedTab, setSelectedTab, setIsAddTxOpen, setEditingTx } = useApp();

  const handleOpenAdd = () => {
    setEditingTx(null);
    setIsAddTxOpen(true);
  };

  const navItems = [
    { id: 'home', label: 'Home', ariaLabel: 'Home', icon: Home },
    { id: 'transactions', label: 'Transactions', ariaLabel: 'Transactions', icon: ReceiptText },
    { id: 'add', label: 'Add', isSpecial: true },
    { id: 'budgets', label: 'Budgets', ariaLabel: 'Budgets', icon: PieChart },
    { id: 'insights', label: 'Insights', ariaLabel: 'Insights', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f17]/95 backdrop-blur-md border-t border-[#1f293d] px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 select-none">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {navItems.map((item) => {
          if (item.isSpecial) {
            return (
              <div key="add-button" className="relative -top-3.5 flex flex-col items-center">
                <button
                  id="btn-add-transaction"
                  type="button"
                  onClick={handleOpenAdd}
                  className="w-12 h-12 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-400/20 active:scale-90 transition-all duration-100 focus:outline-none ring-4 ring-[#0b0f17] border border-amber-300"
                  aria-label="Add transaction"
                >
                  <Plus className="w-6 h-6 stroke-[2.8]" />
                </button>
                <span className="mono text-[9px] font-bold text-amber-400 mt-0.5 tracking-wider">LOG</span>
              </div>
            );
          }

          const Icon = item.icon!;
          const isActive = selectedTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              type="button"
              aria-label={item.ariaLabel}
              onClick={() => setSelectedTab(item.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all duration-100 active:scale-95 ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? 'text-amber-400 stroke-[2.3]' : 'stroke-[1.6]'}`} />
              <span className={`text-[10px] tracking-tight ${isActive ? 'text-slate-100 font-semibold' : 'text-slate-400'}`}>{item.label}</span>
            </button>
          );
        })}

        {/* Dedicated Settings Button */}
        <button
          id="nav-tab-settings"
          type="button"
          aria-label="Settings"
          onClick={() => setSelectedTab('settings')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all duration-100 active:scale-95 ${
            selectedTab === 'settings'
              ? 'text-white font-semibold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Settings2 className={`w-5 h-5 mb-0.5 ${selectedTab === 'settings' ? 'text-amber-400 stroke-[2.3]' : 'stroke-[1.6]'}`} />
          <span className={`text-[10px] tracking-tight ${selectedTab === 'settings' ? 'text-slate-100 font-semibold' : 'text-slate-400'}`}>Settings</span>
        </button>
      </div>
    </nav>
  );
};
