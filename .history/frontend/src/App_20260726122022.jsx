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
import Toppers from './pages/public/Toppers';
import Contact from './pages/public/Contact';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Onboarding from './pages/Onboarding';
import Overview from './pages/Overview';
import Attendance from './pages/Attendance';
import AttendanceApprovals from './pages/AttendanceApprovals';
import Payroll from './pages/Payroll';
import Documents from './pages/Documents';
import Training from './pages/Training';
import TrainingAdmin from './pages/TrainingAdmin';
import Consent from './pages/Consent';
import BankDetails from './pages/BankDetails';
import BankRequestsAdmin from './pages/BankRequestsAdmin';
import PoliciesAdmin from './pages/PoliciesAdmin';
import FacultyAdmin from './pages/FacultyAdmin';
import LeadershipAdmin from './pages/LeadershipAdmin';
import ToppersAdmin from './pages/ToppersAdmin';
import JobsAdmin from './pages/JobsAdmin';
import ContactAdmin from './pages/ContactAdmin';
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
        <Route path="/toppers" element={<Toppers />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/onboarding" element={<Onboarding />} />

      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Overview />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="attendance-approvals" element={<AttendanceApprovals />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="documents" element={<Documents />} />
        <Route path="training" element={<Training />} />
        <Route path="training-admin" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><TrainingAdmin /></RoleRoute>} />
        <Route path="consent" element={<Consent />} />
        <Route path="bank-details" element={<BankDetails />} />
        <Route path="bank-requests-admin" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><BankRequestsAdmin /></RoleRoute>} />
        <Route path="policies-admin" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><PoliciesAdmin /></RoleRoute>} />
        <Route path="faculty-admin" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><FacultyAdmin /></RoleRoute>} />
        <Route path="leadership-admin" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><LeadershipAdmin /></RoleRoute>} />
        <Route path="toppers-admin" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><ToppersAdmin /></RoleRoute>} />
        <Route path="jobs-admin" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><JobsAdmin /></RoleRoute>} />
        <Route path="contact-admin" element={<RoleRoute roles={['HR_ADMIN', 'SUPER_ADMIN']}><ContactAdmin /></RoleRoute>} />
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