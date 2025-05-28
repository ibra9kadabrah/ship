// frontend/src/pages/OfficeReportManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { OfficeReportModification } from '../components/OfficeReportModification';
import { reportModificationApi, getReportById } from '../services/api'; // Import getReportById
import { Report, ReportType, FullReportViewDTO } from '../types/report'; // Import FullReportViewDTO

// Define a more specific type for reports listed on this page
interface ReportListItem extends Partial<Report> { // Keep Partial<Report> for other optional fields from base
  id: string; // id is always present
  reportDate: string; // reportDate is always present
  reportType: ReportType; // Use the specific ReportType
  vesselName?: string; // Assuming vesselName is available from backend
  captainName?: string; // Assuming captainName is available from backend
  // Add other fields you expect to display
}


export const OfficeReportManagementPage: React.FC = () => {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [selectedReportDetails, setSelectedReportDetails] = useState<FullReportViewDTO | null>(null);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovedReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const approvedReports = await reportModificationApi.getApprovedReports();
      setReports(approvedReports);
    } catch (err: any) {
      console.error('Failed to load approved reports:', err);
      setError(err.message || 'Failed to fetch reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedReports();
  }, []);

  const handleModifyClick = async (report: ReportListItem) => {
    setIsLoadingDetails(true);
    setError(null);
    try {
      const fullReportDetails = await getReportById(report.id); // Fetch full details
      setSelectedReportDetails(fullReportDetails);
      setShowModificationModal(true);
    } catch (err: any) {
      console.error(`Failed to load full details for report ${report.id}:`, err);
      setError(err.message || `Failed to load details for report ${report.id}.`);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleModalClose = () => {
    setShowModificationModal(false);
    setSelectedReportDetails(null);
  };

  const handleModificationSuccess = () => {
    setShowModificationModal(false);
    setSelectedReportDetails(null);
    fetchApprovedReports(); // Refresh the list of reports
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading approved reports...</div>;
  }

  if (error && !isLoadingDetails) { // Show general error if not loading details
    return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Report Management</h1>
      
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700">Approved Reports</h2>
          <p className="text-sm text-gray-500 mt-1">
            Select a report to modify. Modifications will trigger cascade recalculations for subsequent reports in the voyage.
          </p>
        </div>
        
        {reports.length === 0 && !isLoading ? (
          <p className="p-6 text-gray-600">No approved reports found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Captain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report.reportDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      <span className="capitalize">{report.reportType}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report.vesselName || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report.captainName || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleModifyClick(report)}
                        disabled={isLoadingDetails}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50"
                      >
                        {isLoadingDetails && selectedReportDetails?.id === report.id ? 'Loading...' : 'Modify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Display error related to loading details specifically */}
      {isLoadingDetails && <p className="p-6 text-center text-blue-600">Loading report details...</p>}
      {error && isLoadingDetails && <p className="p-6 text-center text-red-600">Error loading details: {error}</p>}


      {showModificationModal && selectedReportDetails && (
        <OfficeReportModification
          reportId={selectedReportDetails.id!} // id will be present on FullReportViewDTO
          reportData={selectedReportDetails} // Pass the full report details
          onClose={handleModalClose}
          onSuccess={handleModificationSuccess}
        />
      )}
    </div>
  );
};