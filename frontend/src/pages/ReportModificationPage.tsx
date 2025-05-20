import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient, { getReportById } from '../services/api';
import { FullReportViewDTO, ReportType } from '../types/report';
import DepartureForm from '../components/forms/DepartureForm';
import NoonForm from '../components/forms/NoonForm';
// Import other form components as they become available for modification
import ArrivalForm from '../components/forms/ArrivalForm'; // Uncommented
import BerthForm from '../components/forms/BerthForm'; // Uncommented
import ArrivalAnchorNoonForm from '../components/forms/ArrivalAnchorNoonForm'; // Uncommented

const ReportModificationPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [reportData, setReportData] = useState<FullReportViewDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reportId) {
      const fetchReport = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await getReportById(reportId);
          setReportData(data);
          console.log("Report data fetched for modification:", data); // Log all fetched data
          if (data.modification_checklist) {
            console.log("Office requested changes for items (checklist IDs):", data.modification_checklist);
          }
        } catch (err: any) {
          console.error("Error fetching report for modification:", err);
          setError(err.response?.data?.error || "Failed to load report data.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchReport();
    } else {
      setError("No report ID provided.");
      setIsLoading(false);
    }
  }, [reportId]);

  if (isLoading) {
    return <div className="p-4 text-center">Loading report for modification...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">Error: {error}</div>;
  }

  if (!reportData) {
    return <div className="p-4 text-center">Report not found or no data loaded.</div>;
  }

  // Conditionally render the correct form based on reportType
  const renderForm = () => {
    if (!reportId) return <p>Error: Report ID is missing.</p>; // Should not happen if reportData is loaded

    switch (reportData.reportType) {
      case 'departure':
        return <DepartureForm reportIdToModify={reportId} />;
      case 'noon':
        return <NoonForm reportIdToModify={reportId} />;
      case 'arrival_anchor_noon':
        return <ArrivalAnchorNoonForm reportIdToModify={reportId} />;
      case 'arrival': // Uncommented
        return <ArrivalForm reportIdToModify={reportId} />; // Uncommented
      case 'berth':
        return <BerthForm
                  reportIdToModify={reportId}
                  initialData={reportData} // Pass the full initial data
                  activeModificationChecklistFromPage={reportData.modification_checklist || []}
                  officeChangesCommentFromPage={reportData.requested_changes_comment || null}
                />;
      default:
        return <p>Unsupported report type for modification: {reportData.reportType}</p>;
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* The title is now handled within each specific form when in modify mode */}
      {/* <h1 className="text-3xl font-bold mb-6 text-center">Modify Report</h1> */}
      {renderForm()}
    </div>
  );
};

export default ReportModificationPage;