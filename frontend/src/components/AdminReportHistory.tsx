import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // For potential links to report details
import { getAllReports } from '../services/api'; // Import the new API function
import { ReportHistoryItem } from '../types/report'; // Reuse type for now

// Define a more specific type if backend provides more data (like names)
type AdminReportHistoryItem = ReportHistoryItem & { 
    vesselName?: string; 
    captainName?: string; 
};

const AdminReportHistory: React.FC = () => {
  const [reports, setReports] = useState<AdminReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAllReports();
        // TODO: Ensure backend returns necessary data (vesselName, captainName)
        // For now, casting assuming the type matches or will be adjusted
        setReports(data as AdminReportHistoryItem[]); 
      } catch (err: any) {
        console.error("Error fetching all reports:", err);
        setError(err.response?.data?.message || "Failed to load report history.");
        setReports([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
       <h2 className="text-xl font-semibold mb-4 text-gray-700">Complete Report History</h2>
      {isLoading && <p className="text-center text-gray-600">Loading report history...</p>}
      {error && <p className="text-center text-red-600 bg-red-100 p-3 rounded">Error: {error}</p>}
      
      {!isLoading && !error && reports.length === 0 && (
        <p className="text-center text-gray-500">No reports found in the system.</p>
      )}

      {!isLoading && !error && reports.length > 0 && (
        <div className="overflow-x-auto"> {/* Added for smaller screens */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Add more columns as needed */}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Captain</th>
                {/* Add link to detail view? */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{report.reportType}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                       report.status === 'approved' ? 'bg-green-100 text-green-800' :
                       report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                       'bg-yellow-100 text-yellow-800' // pending
                     }`}>
                       {report.status}
                     </span>
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     {report.reportDate} {report.reportTime} 
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.vesselName || 'N/A'}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.captainName || 'N/A'}</td>
                   {/* Optional: Link to detail view */}
                   {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                     <Link to={`/admin/report/${report.id}`} className="text-indigo-600 hover:text-indigo-900">Details</Link>
                   </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReportHistory;
