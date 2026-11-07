import { Navigate, Route, Routes } from 'react-router-dom';
import BasicLayout from '@/layouts/BasicLayout';
import AccountsPage from '@/pages/accounts';
import DashboardPage from '@/pages/dashboard';
import ImportPage from '@/pages/import';
import LoginPage from '@/pages/login';
import ReportsPage from '@/pages/reports';
import RulesPage from '@/pages/rules';
import TransactionsPage from '@/pages/transactions';
import { GuestOnly, RequireAuth } from './guards';

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<BasicLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/rules" element={<RulesPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
