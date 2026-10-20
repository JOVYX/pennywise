import { BackupWarningBanner } from '../components/dashboard/BackupWarningBanner';
import { BalanceCard } from '../components/dashboard/BalanceCard';
import { DailyAllowanceCard } from '../components/dashboard/DailyAllowanceCard';
import { MonthlyOverviewCards } from '../components/dashboard/MonthlyOverviewCards';
import { ActionableInsightCard } from '../components/dashboard/ActionableInsightCard';
import { SavingsGoalWidget } from '../components/dashboard/SavingsGoalWidget';
import { UpcomingBillsWidget } from '../components/dashboard/UpcomingBillsWidget';
import { RecentTransactionsWidget } from '../components/dashboard/RecentTransactionsWidget';

export const DashboardView: React.FC = () => {
  return (
    <div className="space-y-4 px-4 py-3 max-w-md mx-auto animate-in fade-in duration-150">
      <BackupWarningBanner />
      <BalanceCard />
      <DailyAllowanceCard />
      <ActionableInsightCard />
      <MonthlyOverviewCards />
      <SavingsGoalWidget />
      <UpcomingBillsWidget />
      <RecentTransactionsWidget />
    </div>
  );
};
