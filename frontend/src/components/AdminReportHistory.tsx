import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { Link } from 'react-router-dom';
import { getAllReports } from '../services/api';
import { ReportHistoryItem } from '../types/report';

// Define a more specific type if backend provides more data (like names)
type AdminReportHistoryItem = ReportHistoryItem & {
    vesselName?: string;
    captainName?: string;
    berthNumber?: string | null; // Added Berth Number
};

// Helper function to group reports by voyageId
const groupReportsByVoyage = (reports: AdminReportHistoryItem[]): Record<string, AdminReportHistoryItem[]> => {
  // Sort reports chronologically (oldest first) before grouping
  const sortedReports = [...reports].sort((a, b) => {
    const dateA = new Date(`${a.reportDate}T${a.reportTime || '00:00:00'}`);
    const dateB = new Date(`${b.reportDate}T${b.reportTime || '00:00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });

  return sortedReports.reduce((acc, report) => {
    const key = report.voyageId || 'unassigned'; // Group reports with null voyageId under 'unassigned'
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(report);
    return acc;
  }, {} as Record<string, AdminReportHistoryItem[]>);
};


const AdminReportHistory: React.FC = () => {
  const [allReports, setAllReports] = useState<AdminReportHistoryItem[]>([]); // Store flat list
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAllReports();
        // Store the flat list fetched from the API
        setAllReports(data as AdminReportHistoryItem[]);
      } catch (err: any) {
        console.error("Error fetching all reports:", err);
        setError(err.response?.data?.message || "Failed to load report history.");
        setAllReports([]); // Clear reports on error
        // Removed incorrect setReports([]) call
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Group reports using useMemo to avoid re-computation on every render
  const groupedReports = useMemo(() => groupReportsByVoyage(allReports), [allReports]);
  // Get sorted voyage IDs (or 'unassigned') to render groups in a consistent order
  // Sorting by the date of the first report in each group (oldest voyage first)
  const sortedVoyageKeys = useMemo(() => {
    return Object.keys(groupedReports).sort((keyA, keyB) => {
      const firstReportA = groupedReports[keyA]?.[0];
      const firstReportB = groupedReports[keyB]?.[0];
      if (!firstReportA || !firstReportB) return 0; // Should not happen if keys exist

      const dateA = new Date(`${firstReportA.reportDate}T${firstReportA.reportTime || '00:00:00'}`);
      const dateB = new Date(`${firstReportB.reportDate}T${firstReportB.reportTime || '00:00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [groupedReports]);


  return (
    <div className="bg-white p-6 rounded-lg shadow">
       <h2 className="text-xl font-semibold mb-4 text-gray-700">Complete Report History (Grouped by Voyage)</h2>
      {isLoading && <p className="text-center text-gray-600">Loading report history...</p>}
      {error && <p className="text-center text-red-600 bg-red-100 p-3 rounded">Error: {error}</p>}

      {!isLoading && !error && allReports.length === 0 && (
        <p className="text-center text-gray-500">No reports found in the system.</p>
      )}

      {!isLoading && !error && allReports.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Captain</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            {/* Iterate through sorted voyage keys */}
            {sortedVoyageKeys.map((voyageKey) => (
              <tbody key={voyageKey} className="bg-white divide-y divide-gray-200 border-t-2 border-gray-300">
                {/* Voyage Header Row */}
                <tr className="bg-blue-50">
                  <td colSpan={7} className="px-6 py-2 text-sm font-semibold text-blue-800"> {/* Increased colSpan */}
                    Voyage: {voyageKey === 'unassigned' ? 'Unassigned / Pending Departure Approval' : `${voyageKey.substring(0, 8)}...`}
                  </td>
                </tr>
                {/* Reports within the voyage */}
                {groupedReports[voyageKey].map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {report.reportType}
                      {/* Conditionally display course for Noon reports */}
                      {report.reportType === 'noon' && (
                        <span className="ml-2 text-xs text-gray-400">
                          (Course: {report.noonCourse ?? report.sospCourse ?? report.rospCourse ?? 'N/A'}°)
                        </span>
                      )}
                      {/* Conditionally display berth number */}
                      {report.reportType === 'berth' && report.berthNumber && (
                        <span className="ml-2 text-xs text-gray-400">
                          (Berth: {report.berthNumber})
                        </span>
                      )}
                    </td>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/office/review/${report.id}`} className="text-indigo-600 hover:text-indigo-900">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReportHistory;
