import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardView } from './views/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { BudgetsView } from './views/BudgetsView';
import { InsightsView } from './views/InsightsView';
import { SettingsView } from './views/SettingsView';
import { TransactionModal } from './components/transactions/TransactionModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { BillSplitterModal } from './components/splitter/BillSplitterModal';
import { BankStatementModal } from './components/importer/BankStatementModal';
import { LockScreen } from './components/security/LockScreen';

const AppContent: React.FC = () => {
  const { selectedTab, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-emerald-400 font-bold text-xl mb-3">
          ₹
        </div>
        <h2 className="text-sm font-semibold text-white tracking-tight">Pennywise</h2>
        <p className="text-xs text-zinc-500 mt-1">Securing local vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      {/* 390px Viewport Shell Container */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-[#0b0f17] relative border-x border-[#1f293d] pb-[5.5rem]">
        {/* Sticky Header with month switcher */}
        <Header />

        {/* Main Tab Screen */}
        <main className="flex-1 overflow-x-hidden">
          {selectedTab === 'home' && <DashboardView />}
          {selectedTab === 'transactions' && <TransactionsView />}
          {selectedTab === 'budgets' && <BudgetsView />}
          {selectedTab === 'insights' && <InsightsView />}
          {selectedTab === 'settings' && <SettingsView />}
        </main>

        {/* Fixed iOS Bottom Navigation Bar with Floating Add button */}
        <BottomNav />

        {/* Global Modals */}
        <TransactionModal />
        <BillSplitterModal />
        <BankStatementModal />
        <OnboardingModal />
        <LockScreen />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
