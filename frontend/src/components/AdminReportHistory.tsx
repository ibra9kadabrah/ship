import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { Link } from 'react-router-dom';
import { getAllReports, getAllVessels, exportVoyageMRVExcel } from '../services/api'; // Added getAllVessels and exportVoyageMRVExcel
import { ReportHistoryItem, ReportType } from '../types/report'; // Ensure ReportType is imported
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
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingVessels, setIsLoadingVessels] = useState(true);
  const [errorVessels, setErrorVessels] = useState<string | null>(null);
  const [exportingVoyageId, setExportingVoyageId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Pass selectedVesselId to getAllReports. If it's an empty string, API handles it as "all".
        const data = await getAllReports(selectedVesselId || undefined); 
        setAllReports(data as AdminReportHistoryItem[]);
      } catch (err: any) {
        console.error("Error fetching all reports:", err);
        setError(err.response?.data?.message || "Failed to load report history.");
        setAllReports([]); 
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch reports if vessels have loaded (or failed to load, to avoid multiple loading states)
    if (!isLoadingVessels) {
        fetchReports();
    }
  }, [selectedVesselId, isLoadingVessels]); // Re-fetch reports when selectedVesselId or isLoadingVessels changes

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

  // Helper function to determine if a voyage is effectively completed
  const isEffectivelyCompleted = React.useCallback((
    currentVoyKey: string,
    currentIndex: number
  ): boolean => {
    if (currentVoyKey === 'unassigned') return false;

    const currentVoyReports = groupedReports[currentVoyKey];
    if (!currentVoyReports || currentVoyReports.length === 0) return false;
    
    const currentVesselId = currentVoyReports[0].vesselId;
    if (!currentVesselId) return false; 

    for (let i = currentIndex + 1; i < sortedVoyageKeys.length; i++) {
      const nextVoyKey = sortedVoyageKeys[i];
      const nextVoyReports = groupedReports[nextVoyKey];
      if (nextVoyReports && nextVoyReports.length > 0) {
        const firstReportOfNextVoyage = nextVoyReports[0];
        if (
          firstReportOfNextVoyage.vesselId === currentVesselId &&
          firstReportOfNextVoyage.reportType === 'departure'
        ) {
          return true; 
        }
      }
    }
    return false;
  }, [groupedReports, sortedVoyageKeys]);


  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Complete Report History (Grouped by Voyage)</h2>
        <div>
          <label htmlFor="vesselFilter" className="mr-2 text-sm font-medium text-gray-700">Filter by Vessel:</label>
          <select
            id="vesselFilter"
            name="vesselFilter"
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

      {(isLoading || isLoadingVessels) && <p className="text-center text-gray-600">Loading data...</p>}
      {error && <p className="text-center text-red-600 bg-red-100 p-3 rounded">Error loading reports: {error}</p>}
      
      {!isLoading && !error && allReports.length === 0 && !isLoadingVessels && (
        <p className="text-center text-gray-500">No reports found for the selected filter.</p>
      )}

      {!isLoading && !error && allReports.length > 0 && !isLoadingVessels && (
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
            {sortedVoyageKeys.map((voyageKey, voyageIndex) => { 
              const showExportButton = voyageKey !== 'unassigned' && isEffectivelyCompleted(voyageKey, voyageIndex);

              return (
              <tbody key={voyageKey} className="bg-white divide-y divide-gray-200 border-t-2 border-gray-300">
                {/* Voyage Header Row */}
                <tr className="bg-blue-50">
                  <td colSpan={6} className="px-6 py-2 text-sm font-semibold text-blue-800"> 
                    Voyage: {voyageKey === 'unassigned' ? 'Unassigned / Pending Departure Approval' : `${voyageKey.substring(0, 8)}...`}
                    {showExportButton && <span className="ml-2 text-xs font-normal text-green-700">(Completed)</span>}
                  </td>
                  <td className="px-6 py-2 text-sm text-right">
                    {showExportButton && (
                      <button
                        onClick={async () => {
                          setExportingVoyageId(voyageKey);
                          setExportError(null);
                          try {
                            await exportVoyageMRVExcel(voyageKey);
                          } catch (err: any) {
                            setExportError(err.message || 'Failed to export');
                          } finally {
                            setExportingVoyageId(null);
                          }
                        }}
                        disabled={exportingVoyageId === voyageKey}
                        className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {exportingVoyageId === voyageKey ? 'Exporting...' : 'Export MRV'}
                      </button>
                    )}
                  </td>
                </tr>
                <React.Fragment> {/* Wrapper for conditional error and report rows */}
                {exportingVoyageId === voyageKey && exportError && (
                    <tr key={`${voyageKey}-export-error`}> {/* Added key to conditional row */}
                        <td colSpan={7} className="px-6 py-1 text-xs text-red-600 bg-red-50">
                            Export Error: {exportError}
                        </td>
                    </tr>
                )}
                {/* Reports within the voyage */}
                {groupedReports[voyageKey].map((report) => (
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
                </React.Fragment> {/* Wrapper End */}
              </tbody>
            );
            })}
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReportHistory;
