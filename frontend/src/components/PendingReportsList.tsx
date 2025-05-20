import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPendingReports, getAllVessels } from '../services/api'; // Added getAllVessels
import { ReportHistoryItem, ReportType, ReportStatus } from '../types/report'; // Ensure ReportType and ReportStatus are imported
import { VesselInfo as Vessel } from '../types/vessel'; // Added Vessel type import

// Helper function to get display name for report types
const getReportTypeDisplayName = (type: ReportType): string => {
  switch (type) {
    case 'departure': return 'Departure';
    case 'noon': return 'Noon';
    case 'arrival': return 'Arrival';
    case 'berth': return 'Berth';
    case 'arrival_anchor_noon': return 'Arr. Anchor Noon';
    default: return type; // Fallback to the raw type
  }
};

// Define a more specific type for pending reports if needed, 
// otherwise ReportHistoryItem might suffice if it includes necessary fields.
// ReportHistoryItem already includes status.
type PendingReport = ReportHistoryItem & {
    vesselName?: string;
    captainName?: string;
    // status: ReportStatus; // Already in ReportHistoryItem
};

// Helper function to get display name for report statuses
const getReportStatusDisplayName = (status: ReportStatus): string => {
  switch (status) {
    case 'pending': return 'Pending Review';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'changes_requested': return 'Changes Requested';
    default: return status;
  }
};

const PendingReportsList: React.FC = () => {
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingVessels, setIsLoadingVessels] = useState(true);
  const [errorVessels, setErrorVessels] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingVessels(true);
      setErrorVessels(null);
      try {
        const vesselsData = await getAllVessels();
        setVessels(vesselsData);
      } catch (err: any) {
        console.error("Error fetching vessels:", err);
        setErrorVessels(err.response?.data?.message || "Failed to load vessels.");
      } finally {
        setIsLoadingVessels(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchPendingReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const responseData = await getPendingReports(selectedVesselId || undefined); 
        setPendingReports(responseData); 
      } catch (err: any) {
        console.error("Error fetching pending reports:", err);
        setError(err.response?.data?.message || "Failed to load pending reports.");
        setPendingReports([]); 
      } finally {
        setIsLoading(false);
      }
    };
    // Only fetch reports if vessels have loaded (or failed to load)
    if (!isLoadingVessels) {
        fetchPendingReports();
    }
  }, [selectedVesselId, isLoadingVessels]);

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Pending Reports for Review</h2>
        <div>
          <label htmlFor="vesselFilterPending" className="mr-2 text-sm font-medium text-gray-700">Filter by Vessel:</label>
          <select
            id="vesselFilterPending"
            name="vesselFilterPending"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            value={selectedVesselId}
            onChange={(e) => setSelectedVesselId(e.target.value)}
            disabled={isLoadingVessels || !!errorVessels}
          >
            <option value="">All Ships</option>
            {vessels.map((vessel) => (
              <option key={vessel.id} value={vessel.id}>
                {vessel.name}
              </option>
            ))}
          </select>
          {isLoadingVessels && <p className="text-xs text-gray-500 mt-1">Loading vessels...</p>}
          {errorVessels && <p className="text-xs text-red-500 mt-1">Error loading vessels.</p>}
        </div>
      </div>

      {(isLoading || isLoadingVessels) && <p className="text-center text-gray-600 p-4">Loading data...</p>}
      {error && <p className="text-center text-red-600 bg-red-100 p-3 rounded m-4">Error loading reports: {error}</p>}
      
      {!isLoading && !error && pendingReports.length === 0 && !isLoadingVessels && (
        <p className="text-center text-gray-500 p-4">No reports are currently pending review for the selected filter.</p>
      )}

      {!isLoading && !error && pendingReports.length > 0 && !isLoadingVessels && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Captain</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getReportTypeDisplayName(report.reportType)}
                    {/* Conditionally display course for Noon reports */}
                    {(report.reportType === 'noon' || report.reportType === 'arrival_anchor_noon') && (
                      <span className="ml-2 text-xs text-gray-400">
                        (Course: {report.noonCourse ?? report.sospCourse ?? report.rospCourse ?? 'N/A'}°)
                      </span>
                    )}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     {report.reportDate} {report.reportTime}
                  </td>
                   {/* Display vesselName and captainName directly (they are optional in the type) */}
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.vesselName}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.captainName}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      report.status === 'changes_requested' ? 'bg-orange-100 text-orange-800' : // Example styling
                      'bg-gray-100 text-gray-800' // Default/fallback
                    }`}>
                      {getReportStatusDisplayName(report.status)}
                    </span>
                  </td>
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
