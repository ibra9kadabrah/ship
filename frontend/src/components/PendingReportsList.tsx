import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPendingReports } from '../services/api'; 
import { ReportHistoryItem } from '../types/report'; 

// Define a more specific type for pending reports if needed, 
// otherwise ReportHistoryItem might suffice if it includes necessary fields.
type PendingReport = ReportHistoryItem & { 
    vesselName?: string; // Add fields expected from backend if different
    captainName?: string; 
};

const PendingReportsList: React.FC = () => {
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const responseData = await getPendingReports(); 
        // TODO: Ensure the backend actually returns vesselName and captainName
        setPendingReports(responseData); 
      } catch (err: any) {
        console.error("Error fetching pending reports:", err);
        setError(err.response?.data?.message || "Failed to load pending reports.");
        setPendingReports([]); // Clear data on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingReports();
  }, []);

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
       <h2 className="text-xl font-semibold text-gray-800 p-6 border-b">Pending Reports for Review</h2>
      {isLoading && <p className="text-center text-gray-600 p-4">Loading pending reports...</p>}
      {error && <p className="text-center text-red-600 bg-red-100 p-3 rounded m-4">Error: {error}</p>}
      
      {!isLoading && !error && pendingReports.length === 0 && (
        <p className="text-center text-gray-500 p-4">No reports are currently pending review.</p>
      )}

      {!isLoading && !error && pendingReports.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Captain</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{report.reportType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     {report.reportDate} {report.reportTime} 
                  </td>
                   {/* Display vesselName and captainName directly (they are optional in the type) */}
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.vesselName}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.captainName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link 
                      to={`/office/review/${report.id}`} 
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      )}
    </div>
  );
};

export default PendingReportsList;
