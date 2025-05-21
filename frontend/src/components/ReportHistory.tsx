import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import apiClient from '../services/api';
import { ReportHistoryItem, ReportStatus } from '../types/report'; // Import ReportStatus

// Removed inline definition, using imported type now
/* interface ReportHistoryItem {
  id: string;
  reportDate: string;
  reportTime: string;
  reportType: 'departure' | 'noon' | 'arrival' | 'berth';
  status: 'pending' | 'approved' | 'rejected';
  voyageId?: string | null; // Include voyageId if available/needed
  // Add other relevant fields to display if necessary, e.g., ports for departure
  departurePort?: string | null;
  destinationPort?: string | null; 
} */

const ReportHistory: React.FC = () => {
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use the correct endpoint for captain's history
        const response = await apiClient.get<ReportHistoryItem[]>('/reports/my-history'); 
        setReports(response.data);
      } catch (err: any) {
        console.error("Error fetching report history:", err);
        setError(err.response?.data?.error || "Failed to load report history.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []); // Empty dependency array means this runs once on mount

  const getStatusColor = (status: ReportStatus) => { // Use imported ReportStatus
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'changes_requested': return 'text-orange-600 bg-orange-100'; // New status
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusDisplayName = (status: ReportStatus): string => {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'changes_requested': return 'Changes Requested';
      default: return status;
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading report history...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">My Report History</h2>
      {reports.length === 0 ? (
        <p className="text-gray-600">No reports submitted yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.reportDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.reportTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {report.reportType}
                    {/* Conditionally display berth number */}
                    {report.reportType === 'berth' && report.berthNumber && (
                      <span className="ml-2 text-xs text-gray-400">(Berth: {report.berthNumber})</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.status)}`}>
                      {getStatusDisplayName(report.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {report.status === 'changes_requested' && (
                      <Link
                        to={`/captain/modify-report/${report.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Modify Report
                      </Link>
                    )}
                    {report.status === 'approved' && (
                      <Link
                        to={`/captain/view-report/${report.id}`}
                        className="text-blue-600 hover:text-blue-900 ml-4" // Added ml-4 for spacing if other actions exist
                      >
                        View Report
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportHistory;
