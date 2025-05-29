// frontend/src/pages/OfficeReportManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { OfficeReportModification } from '../components/OfficeReportModification';
import { reportModificationApi, getReportById } from '../services/api';
import { Report, ReportType, FullReportViewDTO } from '../types/report';

interface ReportListItem extends Partial<Report> {
  id: string;
  reportDate: string;
  reportType: ReportType;
  vesselName?: string;
  captainName?: string;
  createdAt?: string; 
  voyageId: string | null; 
}

interface VoyageReportGroup {
  voyageId: string;
  reports: ReportListItem[];
  latestReportTimestamp: number; 
}

export const OfficeReportManagementPage: React.FC = () => {
  const [groupedReports, setGroupedReports] = useState<VoyageReportGroup[]>([]);
  const [selectedReportDetails, setSelectedReportDetails] = useState<FullReportViewDTO | null>(null);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTimestamp = (dateString?: string): number => {
    if (!dateString) return 0;
    try {
      return new Date(dateString).getTime();
    } catch {
      return 0;
    }
  };

  const fetchApprovedReportsAndGroup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const approvedReports: ReportListItem[] = await reportModificationApi.getApprovedReports();
      
      const reportsByVoyage = approvedReports.reduce((acc, report) => {
        const voyageId = report.voyageId || 'unknown_voyage';
        if (!acc[voyageId]) {
          acc[voyageId] = [];
        }
        acc[voyageId].push(report);
        return acc;
      }, {} as Record<string, ReportListItem[]>);

      const voyageGroups: VoyageReportGroup[] = Object.entries(reportsByVoyage).map(([voyageId, reportsInGroup]) => {
        reportsInGroup.sort((a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt));
        
        const latestReportTimestamp = reportsInGroup.length > 0 
          ? getTimestamp(reportsInGroup[reportsInGroup.length - 1].createdAt) 
          : 0;

        return {
          voyageId,
          reports: reportsInGroup,
          latestReportTimestamp,
        };
      });

      voyageGroups.sort((a, b) => b.latestReportTimestamp - a.latestReportTimestamp);
      setGroupedReports(voyageGroups);

    } catch (err: any) {
      console.error('Failed to load and group approved reports:', err);
      setError(err.message || 'Failed to fetch reports. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedReportsAndGroup();
  }, []);

  const handleModifyClick = async (report: ReportListItem) => {
    setIsLoadingDetails(true);
    setError(null);
    try {
      const fullReportDetails = await getReportById(report.id);
      setSelectedReportDetails(fullReportDetails);
      setShowModificationModal(true);
    } catch (err: any) { // Corrected catch block
      setError(err.message || `Failed to load details for report ${report.id}.`);
    } finally { // Corrected finally block
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
    fetchApprovedReportsAndGroup(); 
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading approved reports...</div>;
  }

  if (error && !isLoadingDetails) { 
    return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Report Management</h1>
      
      {groupedReports.length === 0 && !isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
          No approved reports found.
        </div>
      ) : (
        groupedReports.map((group) => (
          <div key={group.voyageId} className="mb-8 bg-white rounded-lg shadow-md">
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <h2 className="text-xl font-semibold text-gray-700">
                Voyage ID: <span className="font-mono text-blue-600">{group.voyageId}</span>
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {group.reports.length} report(s) in this voyage.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Captain</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report.reportDate} {report.reportTime}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <span className="capitalize">{report.reportType.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report.vesselName || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report.captainName || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'}</td>
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
          </div>
        ))
      )}

      {isLoadingDetails && <p className="p-6 text-center text-blue-600">Loading report details...</p>}
      {error && isLoadingDetails && <p className="p-6 text-center text-red-600">Error loading details: {error}</p>}

      {showModificationModal && selectedReportDetails && (
        <OfficeReportModification
          reportId={selectedReportDetails.id!}
          reportData={selectedReportDetails}
          onClose={handleModalClose}
          onSuccess={handleModificationSuccess}
        />
      )}
    </div>
  );
}; // This closing brace was missing or misplaced, ensuring all logic is within the component