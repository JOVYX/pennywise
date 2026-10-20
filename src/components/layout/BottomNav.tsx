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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/85 backdrop-blur-3xl border-t border-white/[0.08] px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 select-none">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {navItems.map((item) => {
          if (item.isSpecial) {
            return (
              <div key="add-button" className="relative -top-3.5 flex flex-col items-center">
                <button
                  id="btn-add-transaction"
                  type="button"
                  onClick={handleOpenAdd}
                  className="w-12 h-12 rounded-full bg-emerald-400 active:bg-emerald-300 text-black flex items-center justify-center shadow-lg shadow-emerald-500/25 active:scale-90 transition-all duration-120 focus:outline-none ring-4 ring-black"
                  aria-label="Add transaction"
                >
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </button>
                <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Add</span>
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
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-120 active:scale-95 ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? 'text-emerald-400 stroke-[2.2]' : 'stroke-[1.6]'}`} />
              <span className={`text-[10px] tracking-tight ${isActive ? 'text-white' : 'text-zinc-500'}`}>{item.label}</span>
            </button>
          );
        })}

        {/* Dedicated Settings Icon Button */}
        <button
          id="nav-tab-settings"
          type="button"
          onClick={() => setSelectedTab('settings')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-120 active:scale-95 ${
            selectedTab === 'settings'
              ? 'text-white font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Settings2 className={`w-5 h-5 mb-0.5 ${selectedTab === 'settings' ? 'text-emerald-400 stroke-[2.2]' : 'stroke-[1.6]'}`} />
          <span className={`text-[10px] tracking-tight ${selectedTab === 'settings' ? 'text-white' : 'text-zinc-500'}`}>Settings</span>
        </button>
      </div>
    </nav>
  );
};
