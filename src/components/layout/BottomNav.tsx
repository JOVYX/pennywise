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
    { id: 'home', label: 'Home', icon: Home },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'add', label: 'Add', isSpecial: true },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/90 dark:bg-neutral-950/90 backdrop-blur-xl border-t border-neutral-800/80 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 select-none">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {navItems.map((item) => {
          if (item.isSpecial) {
            return (
              <div key="add-button" className="relative -top-4 flex flex-col items-center">
                <button
                  id="btn-add-transaction"
                  type="button"
                  onClick={handleOpenAdd}
                  className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform duration-150 focus:outline-none ring-4 ring-neutral-950"
                  aria-label="Add transaction"
                >
                  <Plus className="w-7 h-7 stroke-[2.5]" />
                </button>
                <span className="text-[10px] font-medium text-neutral-400 mt-1">Add</span>
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
              onClick={() => setSelectedTab(item.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-emerald-400 font-semibold scale-105'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Dedicated Settings Icon Button */}
        <button
          id="nav-tab-settings"
          type="button"
          onClick={() => setSelectedTab('settings')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 ${
            selectedTab === 'settings'
              ? 'text-emerald-400 font-semibold scale-105'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Settings2 className={`w-5 h-5 mb-1 ${selectedTab === 'settings' ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight">Settings</span>
        </button>
      </div>
    </nav>
  );
};
