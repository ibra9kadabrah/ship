import React from 'react';
import PendingReportsList from '../components/PendingReportsList'; // Import the list component

// This page component simply wraps the PendingReportsList
const PendingReportsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* The PendingReportsList component handles fetching and displaying */}
      <PendingReportsList />
    </div>
  );
};

export default PendingReportsPage;
