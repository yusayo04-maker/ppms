import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, skipAuthChange } from './lib/supabase';
import AdminLayout from './layouts/admin/AdminLayout';
import BHWLayout from './layouts/bhw/BHWLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminPatients from './pages/admin/Patients';
import AdminReferrals from './pages/admin/Referrals';
import AdminPatientRecord from './pages/admin/PatientRecord';
import UserManagement from './pages/admin/UserManagement';
import AdminSettings from './pages/admin/Settings';
import AdminSmsLogs from './pages/admin/SmsLogs';

// BHW Pages
import BHWDashboard from './pages/bhw/Dashboard';
import BHWAddPatient from './pages/bhw/AddPatient';
import BHWPatients from './pages/bhw/Patients';
import BHWReferrals from './pages/bhw/Referrals';
import BHWPatientRecord from './pages/bhw/PatientRecord';
import BHWReferPatient from './pages/bhw/ReferPatient';
import BHWSettings from './pages/bhw/Settings';
import Notifications from './pages/common/Notifications';
import Login from './pages/Login';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: 'mho_admin' | 'bhw' }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Skip auth changes during admin account creation
      if (skipAuthChange) return;
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
    </div>
  );

  if (!session) return <Navigate to="/login" replace />;

  const role = session.user.user_metadata?.role;
  if (role !== allowedRole) {
    console.warn(`Access denied: User role "${role}" does not match required role "${allowedRole}"`);
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

import { NotificationProvider } from './contexts/NotificationContext';

function App() {
  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin Portal */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRole="mho_admin">
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="referrals" element={<AdminReferrals />} />
            <Route path="patients" element={<AdminPatients />} />
            <Route path="patients/:id" element={<AdminPatientRecord />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="sms-logs" element={<AdminSmsLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* BHW Portal */}
          <Route path="/bhw" element={
            <ProtectedRoute allowedRole="bhw">
              <BHWLayout />
            </ProtectedRoute>
          }>
            <Route index element={<BHWDashboard />} />
            <Route path="add-patient" element={<BHWAddPatient />} />
            <Route path="patients" element={<BHWPatients />} />
            <Route path="patients/:id" element={<BHWPatientRecord />} />
            <Route path="patients/:id/refer" element={<BHWReferPatient />} />
            <Route path="referrals" element={<BHWReferrals />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<BHWSettings />} />
          </Route>

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}

export default App;

