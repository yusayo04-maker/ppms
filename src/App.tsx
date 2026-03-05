import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/admin/AdminLayout';
import BHWLayout from './layouts/bhw/BHWLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminPatients from './pages/admin/Patients';
import AdminReferrals from './pages/admin/Referrals';
import AdminPatientRecord from './pages/admin/PatientRecord';
import UserManagement from './pages/admin/UserManagement';
import AdminSettings from './pages/admin/Settings';

// BHW Pages
import BHWDashboard from './pages/bhw/Dashboard';
import BHWAddPatient from './pages/bhw/AddPatient';
import BHWPatients from './pages/bhw/Patients';
import BHWReferrals from './pages/bhw/Referrals';
import BHWPatientRecord from './pages/bhw/PatientRecord';
import BHWReferPatient from './pages/bhw/ReferPatient';
import BHWSettings from './pages/bhw/Settings';
import Notifications from './pages/common/Notifications';


function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to admin for now, or we can have a login page later */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* Admin Portal */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="referrals" element={<AdminReferrals />} />
          <Route path="patients" element={<AdminPatients />} />
          <Route path="patients/:id" element={<AdminPatientRecord />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<AdminSettings />} />

        </Route>

        {/* BHW Portal */}
        <Route path="/bhw" element={<BHWLayout />}>
          <Route index element={<BHWDashboard />} />
          <Route path="add-patient" element={<BHWAddPatient />} />
          <Route path="patients" element={<BHWPatients />} />
          <Route path="patients/:id" element={<BHWPatientRecord />} />
          <Route path="patients/:id/refer" element={<BHWReferPatient />} />
          <Route path="referrals" element={<BHWReferrals />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<BHWSettings />} />

        </Route>
      </Routes>
    </Router>
  );
}

export default App;
