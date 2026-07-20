import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import PublicLayout from './components/PublicLayout';

import Home from './pages/public/Home';
import Products from './pages/public/Products';
import Faculty from './pages/public/Faculty';
import Services from './pages/public/Services';
import Careers from './pages/public/Careers';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Onboarding from './pages/Onboarding';
import Overview from './pages/Overview';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Documents from './pages/Documents';
import Training from './pages/Training';
import Employees from './pages/Employees';
import OnboardingReview from './pages/OnboardingReview';
import Leave from './pages/Leave';
import LeaveApprovals from './pages/LeaveApprovals';
import OfferLetters from './pages/OfferLetters';

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/app" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/faculty" element={<Faculty />} />
        <Route path="/services" element={<Services />} />
        <Route path="/careers" element={<Careers />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/onboarding" element={<Onboarding />} />

      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Overview />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="documents" element={<Documents />} />
        <Route path="training" element={<Training />} />
        <Route path="leave" element={<Leave />} />
        <Route path="team-leave" element={<LeaveApprovals />} />
        <Route path="employees" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><Employees /></RoleRoute>} />
        <Route path="onboarding-review" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><OnboardingReview /></RoleRoute>} />
        <Route path="leave-approvals" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><LeaveApprovals /></RoleRoute>} />
        <Route path="offer-letters" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><OfferLetters /></RoleRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}