import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom'; // Removed Outlet, Added useParams
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import CaptainLayout from './layouts/CaptainLayout'; // Import actual layout
import CaptainDisplayDashboardPage from './pages/CaptainDisplayDashboardPage'; // Import new dashboard
// import CaptainDashboardPage from './pages/CaptainDashboardPage'; 
import DepartureForm from './components/forms/DepartureForm'; // Import actual form
import NoonForm from './components/forms/NoonForm'; // Import actual form
import ArrivalForm from './components/forms/ArrivalForm';
import BerthForm from './components/forms/BerthForm';
import ArrivalAnchorNoonForm from './components/forms/ArrivalAnchorNoonForm'; // Import new form
import ReportHistory from './components/ReportHistory'; // Import the actual history component
// Import new Office components (will be created later)
import OfficeLayout from './layouts/OfficeLayout'; 
import OfficeDashboardPage from './pages/OfficeDashboardPage'; // Renamed conceptually to OfficeHistoryPage
import PendingReportsPage from './pages/PendingReportsPage'; // Import the new pending reports page
import ReportReviewPage from './pages/ReportReviewPage';
import ReportModificationPage from './pages/ReportModificationPage'; // Import the new modification page

// Removed CaptainDashboardPlaceholder

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} /> 
          {/* Use actual LoginPage component */}

          {/* Protected Admin Route */}
          <Route element={<ProtectedRoute roles={['admin']} />}> {/* Specify admin role */}
            <Route path="/admin" element={<AdminDashboard />} /> 
            {/* Use actual AdminDashboard component */}
          </Route>

          {/* Protected Captain Routes */}
          <Route path="/captain" element={<ProtectedRoute roles={['captain']} />}> {/* Specify captain role */}
            <Route element={<CaptainLayout />}> {/* Use actual Layout */}
              <Route index element={<CaptainDisplayDashboardPage />} /> {/* Default to new dashboard */}
              <Route path="dashboard-display" element={<CaptainDisplayDashboardPage />} /> {/* Explicit dashboard route */}
              <Route path="history" element={<ReportHistory />} /> {/* Route for report history */}
              <Route path="forms/departure" element={<DepartureForm />} /> {/* Use actual form */}
              <Route path="forms/noon" element={<NoonForm />} /> {/* Add Noon route */}
              <Route path="forms/arrival" element={<ArrivalForm />} /> {/* Add Arrival route */}
              <Route path="forms/arrival-anchor-noon" element={<ArrivalAnchorNoonForm />} /> {/* Add Arrival Anchor Noon route */}
              <Route path="forms/berth" element={<BerthForm />} /> {/* Add Berth route */}
              <Route path="modify-report/:reportId" element={<ReportModificationPage />} /> {/* Updated route */}
              <Route path="view-report/:reportId" element={<ReportReviewPage />} /> {/* Added route for viewing approved reports */}
              {/* Add other nested captain routes here if needed */}
            </Route>
          </Route>

          {/* Protected Office/Admin Routes */}
          <Route path="/office" element={<ProtectedRoute roles={['office', 'admin']} />}> {/* Allow office and admin */}
            <Route element={<OfficeLayout />}> {/* Use Office Layout */}
              <Route index element={<PendingReportsPage />} /> {/* Index shows pending reports */}
              <Route path="history" element={<OfficeDashboardPage />} /> {/* New route for complete history */}
              <Route path="review/:reportId" element={<ReportReviewPage />} /> {/* Report review detail */}
            </Route>
          </Route>

          {/* Default route: Redirect based on auth */}
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Helper component for default redirection
const DefaultRedirect: React.FC = () => {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  // Redirect logic based on role
  if (token) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user?.role === 'captain') {
      return <Navigate to="/captain/dashboard-display" replace />; // Redirect captain to new dashboard
    } else if (user?.role === 'office') { // Add redirect for office role
      return <Navigate to="/office" replace />;
    }
  }
  
  // If no token or unrecognized role, redirect to login
  return <Navigate to="/login" replace />;
};

export default App;
