import React from 'react';
import { VesselInfo } from '../../../../types/vessel'; // Adjusted path
import { FullReportViewDTO } from '../../../../types/report'; // Adjusted path
import { User } from '../../../../types/user'; // Adjusted path

interface VesselInfoDisplayProps {
  vesselInfo?: VesselInfo | null;
  initialReportData?: FullReportViewDTO | null;
  user?: User | null; // Assuming User type is available from auth context
  isModifyMode?: boolean;
  isLoading?: boolean;
}

const VesselInfoDisplay: React.FC<VesselInfoDisplayProps> = ({
  vesselInfo,
  initialReportData,
  user,
  isModifyMode = false,
  isLoading = false
}) => {
  if (isLoading && !vesselInfo && !initialReportData) { // Check initialReportData too if it can provide info
    return <div className="p-4 text-center">Loading vessel information...</div>;
  }

  // Determine which data source to use based on mode and availability
  const displayVesselName = isModifyMode && initialReportData 
    ? initialReportData.vesselName 
    : vesselInfo?.name;
  
  const displayCaptainName = isModifyMode && initialReportData 
    ? initialReportData.captainName 
    : user?.name;

  // If no data to display after loading, render nothing or a placeholder
  if (!displayVesselName && !vesselInfo?.imoNumber && !initialReportData?.vesselId) {
    return null; 
  }

  return (
    <div className="mb-6 p-4 border rounded bg-gray-50">
      <h3 className="text-lg font-medium text-gray-700 mb-2">Vessel & Captain Information</h3>
      {displayVesselName && (
        <p><strong>Vessel Name:</strong> {displayVesselName}</p>
      )}
      {/* Show IMO and DWT only if not in modify mode and vesselInfo is available */}
      {!isModifyMode && vesselInfo && (
        <>
          {vesselInfo.imoNumber && <p><strong>IMO Number:</strong> {vesselInfo.imoNumber}</p>}
          {vesselInfo.deadweight && <p><strong>Deadweight (DWT):</strong> {vesselInfo.deadweight}</p>}
        </>
      )}
      {/* Show Vessel ID if in modify mode and initialReportData is available */}
      {isModifyMode && initialReportData?.vesselId && (
        <p><strong>Vessel ID:</strong> {initialReportData.vesselId}</p>
      )}
      {displayCaptainName && (
        <p><strong>Captain:</strong> {displayCaptainName}</p>
      )}
    </div>
  );
};

export default VesselInfoDisplay;