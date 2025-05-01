import React from 'react';
// Removed unused imports: useState, useEffect, Link, getPendingReports, ReportHistoryItem
import AdminReportHistory from '../components/AdminReportHistory'; // Import the history component

// This page now only displays the complete report history for Office/Admin users
const OfficeDashboardPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Render the AdminReportHistory component directly */}
      {/* The AdminReportHistory component handles its own data fetching and display */}
      <AdminReportHistory />
    </div>
  );
};

export default OfficeDashboardPage;
