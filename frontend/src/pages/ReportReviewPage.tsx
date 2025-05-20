import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReportById, reviewReport } from '../services/api'; // Import specific functions
// Import the full report view type
import { FullReportViewDTO, ReportStatus } from '../types/report'; // Import ReportStatus
import { ChecklistItem, getChecklistForReportType, departureChecklistItems } from '../config/reportChecklists'; // Corrected import path

// Placeholder type removed

const ReportReviewPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  
  // Use the correct DTO type for state
  const [reportDetails, setReportDetails] = useState<FullReportViewDTO | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState(''); // For general approve/reject
  const [requestedChangesComment, setRequestedChangesComment] = useState(''); // For 'changes_requested'
  const [selectedChecklistItems, setSelectedChecklistItems] = useState<string[]>([]);
  const [currentChecklist, setCurrentChecklist] = useState<ChecklistItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReportDetails = async () => {
      if (!reportId) {
        setError("Report ID is missing.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      setSubmitError(null); // Clear previous submission errors
      try {
        // Call the actual API function
        const fetchedReport = await getReportById(reportId);
        setReportDetails(fetchedReport);
        if (fetchedReport.reportType === 'departure') {
          setCurrentChecklist(departureChecklistItems); // Initially load departure checklist
        } else {
          // Later, use getChecklistForReportType(fetchedReport.reportType) when other types are supported
          setCurrentChecklist([]);
        }
      } catch (err: any) {
        console.error(`Error fetching report ${reportId}:`, err);
        setError(err.response?.data?.message || `Failed to load report details for ID: ${reportId}.`);
        setReportDetails(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportDetails();
  }, [reportId]); // Refetch if reportId changes

  const handleChecklistItemChange = (itemId: string) => {
    setSelectedChecklistItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleReviewSubmit = async (status: ReportStatus) => {
     if (!reportId) return;
     setIsSubmitting(true);
     setSubmitError(null);

     const payload: any = { status }; // Use 'any' for payload to dynamically add properties

     if (status === 'approved' || status === 'rejected') {
        payload.reviewComments = reviewComments;
     } else if (status === 'changes_requested') {
        payload.modification_checklist = selectedChecklistItems;
        payload.requested_changes_comment = requestedChangesComment;
        // Optionally, clear general reviewComments if it's not relevant for 'changes_requested'
        // payload.reviewComments = '';
     }

     try {
        await reviewReport(reportId, payload);
        navigate('/office'); // Navigate to pending reports list
     } catch (err: any) {
         console.error(`Error submitting review for report ${reportId} with status ${status}:`, err);
         setSubmitError(err.response?.data?.message || `Failed to ${status} report.`);
     } finally {
         setIsSubmitting(false);
     }
  };

  if (isLoading) return <p className="text-center p-4">Loading report details...</p>;
  if (error) return <p className="text-center text-red-600 bg-red-100 p-3 rounded">Error: {error}</p>;
  if (!reportDetails) return <p className="text-center p-4">Report not found.</p>;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Review Report: <span className="font-mono text-lg">{reportId}</span></h1>
      
      {/* Display Report Details */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 space-y-6">
        {/* --- General Info --- */}
        <section>
          <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">General Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <div><strong>Report Type:</strong> <span className="capitalize">{reportDetails.reportType}</span></div>
            <div><strong>Report Date:</strong> {reportDetails.reportDate}</div>
            <div><strong>Report Time:</strong> {reportDetails.reportTime} ({reportDetails.timeZone})</div>
            <div><strong>Vessel:</strong> {reportDetails.vesselName}</div>
            <div><strong>Captain:</strong> {reportDetails.captainName}</div>
            <div><strong>Status:</strong> <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              reportDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              reportDetails.status === 'approved' ? 'bg-green-100 text-green-800' :
              reportDetails.status === 'rejected' ? 'bg-red-100 text-red-800' :
              reportDetails.status === 'changes_requested' ? 'bg-orange-100 text-orange-800' : // Added styling for changes_requested
              'bg-gray-100 text-gray-800' // Default fallback
            }`}>{
              reportDetails.status === 'pending' ? 'Pending Review' :
              reportDetails.status === 'approved' ? 'Approved' :
              reportDetails.status === 'rejected' ? 'Rejected' :
              reportDetails.status === 'changes_requested' ? 'Changes Requested' :
              reportDetails.status // Fallback to raw status if not one of the above
            }</span></div>
            {reportDetails.voyageId && <div><strong>Voyage ID:</strong> <span className="font-mono text-xs">{reportDetails.voyageId}</span></div>}
          </div>
        </section>

        {/* --- Voyage & Cargo --- */}
        {(reportDetails.reportType === 'departure' || reportDetails.voyageId) && (
          <section>
            <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Voyage & Cargo</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              {reportDetails.departurePort && <div><strong>Departure Port:</strong> {reportDetails.departurePort}</div>}
              {reportDetails.destinationPort && <div><strong>Destination Port:</strong> {reportDetails.destinationPort}</div>}
              {reportDetails.voyageDistance !== null && <div><strong>Voyage Distance:</strong> {reportDetails.voyageDistance} NM</div>}
              {reportDetails.etaDate && <div><strong>ETA:</strong> {reportDetails.etaDate} {reportDetails.etaTime}</div>}
              {reportDetails.fwdDraft !== null && <div><strong>Fwd Draft:</strong> {reportDetails.fwdDraft?.toFixed(2)} m</div>}
              {reportDetails.aftDraft !== null && <div><strong>Aft Draft:</strong> {reportDetails.aftDraft?.toFixed(2)} m</div>}
              {/* Display voyage cargo details if available */}
              {reportDetails.voyageCargoType && <div><strong>Cargo Type:</strong> {reportDetails.voyageCargoType}</div>}
              {reportDetails.voyageCargoQuantity !== null && <div><strong>Cargo Qty:</strong> {reportDetails.voyageCargoQuantity?.toFixed(2)} MT ({reportDetails.voyageCargoStatus})</div>}
              {/* Display report-specific cargo if different (e.g., berth) */}
              {reportDetails.reportType === 'berth' && reportDetails.cargoQuantity !== reportDetails.voyageCargoQuantity && (
                 <div><strong>Current Cargo Qty:</strong> {reportDetails.cargoQuantity?.toFixed(2)} MT</div>
              )}
            </div>
          </section>
        )}
        
        {/* --- Position & Distance --- */}
         <section>
            <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Position & Distance</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm"> {/* Adjusted grid for better coordinate display */}
                {/* Display relevant position based on report type using Deg/Min/Dir */}
                {reportDetails.reportType === 'departure' && reportDetails.faspLatDeg !== null && (
                  <div><strong>FASP:</strong> {reportDetails.faspLatDeg}° {reportDetails.faspLatMin?.toFixed(3)}' {reportDetails.faspLatDir} / {reportDetails.faspLonDeg}° {reportDetails.faspLonMin?.toFixed(3)}' {reportDetails.faspLonDir} @ {reportDetails.faspCourse}° ({reportDetails.faspDate} {reportDetails.faspTime})</div>
                )}
                {reportDetails.reportType === 'noon' && reportDetails.noonLatDeg !== null && (
                  <div className="col-span-full"> {/* Span full width for better layout */}
                    <strong>Noon Pos:</strong> {reportDetails.noonLatDeg}° {reportDetails.noonLatMin?.toFixed(3)}' {reportDetails.noonLatDir} / {reportDetails.noonLonDeg}° {reportDetails.noonLonMin?.toFixed(3)}' {reportDetails.noonLonDir} @ {reportDetails.noonCourse ?? 'N/A'}° ({reportDetails.noonDate} {reportDetails.noonTime})
                    {/* Add Passage State with conditional styling */}
                    {reportDetails.passageState && (
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                        reportDetails.passageState === 'SOSP' ? 'bg-yellow-100 text-yellow-800' :
                        reportDetails.passageState === 'ROSP' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800' // Default for NOON or others
                      }`}>
                        {reportDetails.passageState}
                      </span>
                    )}
                  </div>
                )}
                {/* Display for Arrival Anchor Noon Report */}
                {(reportDetails.reportType === 'arrival_anchor_noon') && reportDetails.noonLatDeg !== null && (
                  <div className="col-span-full">
                    <strong>Anchor Noon Pos:</strong> {reportDetails.noonLatDeg}° {reportDetails.noonLatMin?.toFixed(3)}' {reportDetails.noonLatDir} / {reportDetails.noonLonDeg}° {reportDetails.noonLonMin?.toFixed(3)}' {reportDetails.noonLonDir} @ {reportDetails.noonCourse ?? 'N/A'}° ({reportDetails.noonDate} {reportDetails.noonTime})
                  </div>
                )}
                {reportDetails.reportType === 'noon' && reportDetails.passageState === 'SOSP' && reportDetails.sospLatDeg !== null && (
                  <div className="col-span-full text-yellow-700"><strong>SOSP:</strong> {reportDetails.sospLatDeg}° {reportDetails.sospLatMin?.toFixed(3)}' {reportDetails.sospLatDir} / {reportDetails.sospLonDeg}° {reportDetails.sospLonMin?.toFixed(3)}' {reportDetails.sospLonDir} @ {reportDetails.sospCourse ?? 'N/A'}° ({reportDetails.sospDate} {reportDetails.sospTime})</div>
                )}
                {reportDetails.reportType === 'noon' && reportDetails.passageState === 'ROSP' && reportDetails.rospLatDeg !== null && (
                  <div className="col-span-full text-green-700"><strong>ROSP:</strong> {reportDetails.rospLatDeg}° {reportDetails.rospLatMin?.toFixed(3)}' {reportDetails.rospLatDir} / {reportDetails.rospLonDeg}° {reportDetails.rospLonMin?.toFixed(3)}' {reportDetails.rospLonDir} @ {reportDetails.rospCourse ?? 'N/A'}° ({reportDetails.rospDate} {reportDetails.rospTime})</div>
                )}
                {reportDetails.reportType === 'arrival' && reportDetails.eospLatDeg !== null && (
                  <div className="col-span-full"><strong>EOSP:</strong> {reportDetails.eospLatDeg}° {reportDetails.eospLatMin?.toFixed(3)}' {reportDetails.eospLatDir} / {reportDetails.eospLonDeg}° {reportDetails.eospLonMin?.toFixed(3)}' {reportDetails.eospLonDir} @ {reportDetails.eospCourse}° ({reportDetails.eospDate} {reportDetails.eospTime})</div>
                )}
                {reportDetails.reportType === 'berth' && reportDetails.berthLatDeg !== null && (
                  <> {/* Use fragment to group position and number */}
                    <div><strong>Berth Pos:</strong> {reportDetails.berthLatDeg}° {reportDetails.berthLatMin?.toFixed(3)}' {reportDetails.berthLatDir} / {reportDetails.berthLonDeg}° {reportDetails.berthLonMin?.toFixed(3)}' {reportDetails.berthLonDir} ({reportDetails.berthDate} {reportDetails.berthTime})</div>
                    {reportDetails.berthNumber && <div><strong>Berth Number:</strong> {reportDetails.berthNumber}</div>}
                  </>
                )}

                {/* Distances & Performance - Now conditional */}
                {(reportDetails.reportType === 'departure' || reportDetails.reportType === 'arrival') && reportDetails.harbourDistance !== null && (
                  <div><strong>Harbour Dist:</strong> {reportDetails.harbourDistance} NM ({reportDetails.harbourTime} hrs)</div>
                )}
                {(reportDetails.reportType === 'noon' || reportDetails.reportType === 'arrival' || reportDetails.reportType === 'arrival_anchor_noon') && reportDetails.distanceSinceLastReport !== null && (
                  <div><strong>Dist Since Last:</strong> {reportDetails.distanceSinceLastReport} NM</div>
                )}
                {reportDetails.totalDistanceTravelled !== null && <div><strong>Total Dist Travelled:</strong> {reportDetails.totalDistanceTravelled?.toFixed(1)} NM</div>}
                {reportDetails.distanceToGo !== null && <div><strong>Dist To Go:</strong> {reportDetails.distanceToGo?.toFixed(1)} NM</div>}
                {/* Performance Metrics */}
                {reportDetails.meDailyRunHours !== null && <div><strong>Sailing Time (24h):</strong> {reportDetails.meDailyRunHours?.toFixed(1)} hrs</div>}
                {/* Calculate Avg Speed (24h) */}
                {(reportDetails.reportType === 'noon' || reportDetails.reportType === 'arrival' || reportDetails.reportType === 'arrival_anchor_noon') && reportDetails.distanceSinceLastReport !== null && reportDetails.meDailyRunHours !== null && reportDetails.meDailyRunHours > 0 && (
                  <div><strong>Avg Speed (24h):</strong> {(reportDetails.distanceSinceLastReport / reportDetails.meDailyRunHours).toFixed(1)} knots</div>
                )}
                {reportDetails.sailingTimeVoyage !== null && <div><strong>Total Sailing Time (Voyage):</strong> {reportDetails.sailingTimeVoyage?.toFixed(1)} hrs</div>}
                {reportDetails.avgSpeedVoyage !== null && <div><strong>Avg Speed (Voyage):</strong> {reportDetails.avgSpeedVoyage?.toFixed(1)} knots</div>}
             </div>
         </section>

        {/* --- Weather --- */}
        <section>
          <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Weather</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            {reportDetails.windDirection && <div><strong>Wind:</strong> {reportDetails.windDirection} / Force {reportDetails.windForce}</div>}
            {reportDetails.seaDirection && <div><strong>Sea:</strong> {reportDetails.seaDirection} / State {reportDetails.seaState}</div>}
            {reportDetails.swellDirection && <div><strong>Swell:</strong> {reportDetails.swellDirection} / {reportDetails.swellHeight?.toFixed(1)} m</div>}
          </div>
        </section>

        {/* --- Bunkers ROB --- */}
        <section>
          <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Remaining On Board (ROB)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 text-sm">
            {reportDetails.currentRobLsifo !== null && <div><strong>LSIFO:</strong> {reportDetails.currentRobLsifo?.toFixed(2)} MT</div>}
            {reportDetails.currentRobLsmgo !== null && <div><strong>LSMGO:</strong> {reportDetails.currentRobLsmgo?.toFixed(2)} MT</div>}
            {reportDetails.currentRobCylOil !== null && <div><strong>Cyl Oil:</strong> {reportDetails.currentRobCylOil?.toFixed(1)} L</div>}
            {reportDetails.currentRobMeOil !== null && <div><strong>ME Oil:</strong> {reportDetails.currentRobMeOil?.toFixed(1)} L</div>}
            {reportDetails.currentRobAeOil !== null && <div><strong>AE Oil:</strong> {reportDetails.currentRobAeOil?.toFixed(1)} L</div>}
          </div>
        </section>

        {/* --- Bunkers Consumption & Supply --- */}
        <section>
          <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Bunker Consumption (24h)</h3>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm">
             {/* Individual Consumption - Conditionally show ME/AE */}
             {reportDetails.reportType !== 'berth' && reportDetails.meConsumptionLsifo !== null && <div><strong>ME LSIFO:</strong> {reportDetails.meConsumptionLsifo?.toFixed(2)} MT</div>}
             {reportDetails.reportType !== 'berth' && reportDetails.meConsumptionLsmgo !== null && <div><strong>ME LSMGO:</strong> {reportDetails.meConsumptionLsmgo?.toFixed(2)} MT</div>}
             {reportDetails.reportType !== 'berth' && reportDetails.meConsumptionCylOil !== null && <div><strong>ME Cyl Oil:</strong> {reportDetails.meConsumptionCylOil?.toFixed(1)} L</div>}
             {reportDetails.reportType !== 'berth' && reportDetails.meConsumptionMeOil !== null && <div><strong>ME Lube Oil:</strong> {reportDetails.meConsumptionMeOil?.toFixed(1)} L</div>}
             {reportDetails.reportType !== 'berth' && reportDetails.meConsumptionAeOil !== null && <div><strong>ME AE Oil:</strong> {reportDetails.meConsumptionAeOil?.toFixed(1)} L</div>}
             {/* Always show Boiler/Aux */}
             {reportDetails.boilerConsumptionLsifo !== null && <div><strong>Boiler LSIFO:</strong> {reportDetails.boilerConsumptionLsifo?.toFixed(2)} MT</div>}
             {reportDetails.boilerConsumptionLsmgo !== null && <div><strong>Boiler LSMGO:</strong> {reportDetails.boilerConsumptionLsmgo?.toFixed(2)} MT</div>}
             {reportDetails.auxConsumptionLsifo !== null && <div><strong>Aux LSIFO:</strong> {reportDetails.auxConsumptionLsifo?.toFixed(2)} MT</div>}
             {reportDetails.auxConsumptionLsmgo !== null && <div><strong>Aux LSMGO:</strong> {reportDetails.auxConsumptionLsmgo?.toFixed(2)} MT</div>}
             {/* Keep Totals? Maybe remove to avoid redundancy */}
             {/* {reportDetails.totalConsumptionLsifo !== null && <div><strong>Total LSIFO Cons:</strong> {reportDetails.totalConsumptionLsifo?.toFixed(2)} MT</div>}
             {reportDetails.totalConsumptionLsmgo !== null && <div><strong>Total LSMGO Cons:</strong> {reportDetails.totalConsumptionLsmgo?.toFixed(2)} MT</div>} */}
             {/* ... keep other totals if desired ... */}
           </div>
        </section>
        <section>
           <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Bunker Supply (Since Last)</h3>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 text-sm">
             {/* Individual Supply */}
             {reportDetails.supplyLsifo !== null && <div><strong>LSIFO:</strong> {reportDetails.supplyLsifo > 0 ? <span className="text-blue-600">{reportDetails.supplyLsifo?.toFixed(2)} MT</span> : '0.00 MT'}</div>}
             {reportDetails.supplyLsmgo !== null && <div><strong>LSMGO:</strong> {reportDetails.supplyLsmgo > 0 ? <span className="text-blue-600">{reportDetails.supplyLsmgo?.toFixed(2)} MT</span> : '0.00 MT'}</div>}
             {reportDetails.supplyCylOil !== null && <div><strong>Cyl Oil:</strong> {reportDetails.supplyCylOil > 0 ? <span className="text-blue-600">{reportDetails.supplyCylOil?.toFixed(1)} L</span> : '0.0 L'}</div>}
             {reportDetails.supplyMeOil !== null && <div><strong>ME Oil:</strong> {reportDetails.supplyMeOil > 0 ? <span className="text-blue-600">{reportDetails.supplyMeOil?.toFixed(1)} L</span> : '0.0 L'}</div>}
             {reportDetails.supplyAeOil !== null && <div><strong>AE Oil:</strong> {reportDetails.supplyAeOil > 0 ? <span className="text-blue-600">{reportDetails.supplyAeOil?.toFixed(1)} L</span> : '0.0 L'}</div>}
           </div>
         </section>

       {/* --- Initial ROBs (If Departure Report and data exists) --- */}
       {reportDetails.reportType === 'departure' && (
         reportDetails.initialRobLsifo !== null ||
         reportDetails.initialRobLsmgo !== null ||
         reportDetails.initialRobCylOil !== null ||
         reportDetails.initialRobMeOil !== null ||
         reportDetails.initialRobAeOil !== null
       ) && (
         <section>
           <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Initial Remaining On Board (at Voyage Start)</h3>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 text-sm">
             {reportDetails.initialRobLsifo !== null && <div><strong>LSIFO:</strong> {reportDetails.initialRobLsifo?.toFixed(2)} MT</div>}
             {reportDetails.initialRobLsmgo !== null && <div><strong>LSMGO:</strong> {reportDetails.initialRobLsmgo?.toFixed(2)} MT</div>}
             {reportDetails.initialRobCylOil !== null && <div><strong>Cyl Oil:</strong> {reportDetails.initialRobCylOil?.toFixed(1)} L</div>}
             {reportDetails.initialRobMeOil !== null && <div><strong>ME Oil:</strong> {reportDetails.initialRobMeOil?.toFixed(1)} L</div>}
             {reportDetails.initialRobAeOil !== null && <div><strong>AE Oil:</strong> {reportDetails.initialRobAeOil?.toFixed(1)} L</div>}
           </div>
         </section>
       )}

        {/* --- Machinery ME --- Conditionally render this whole section */}
        {reportDetails.reportType !== 'berth' && (
          <section>
            <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Main Engine Parameters</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm">
              {reportDetails.meFoPressure !== null && <div><strong>FO Press:</strong> {reportDetails.meFoPressure?.toFixed(1)} bar</div>}
            {reportDetails.meLubOilPressure !== null && <div><strong>LO Press:</strong> {reportDetails.meLubOilPressure?.toFixed(1)} bar</div>}
            {reportDetails.meFwInletTemp !== null && <div><strong>FW Inlet:</strong> {reportDetails.meFwInletTemp?.toFixed(1)} °C</div>}
            {reportDetails.meLoInletTemp !== null && <div><strong>LO Inlet:</strong> {reportDetails.meLoInletTemp?.toFixed(1)} °C</div>}
            {reportDetails.meScavengeAirTemp !== null && <div><strong>Scav Air:</strong> {reportDetails.meScavengeAirTemp?.toFixed(1)} °C</div>}
            {reportDetails.meTcRpm1 !== null && <div><strong>TC#1 RPM:</strong> {reportDetails.meTcRpm1}</div>}
            {reportDetails.meTcRpm2 !== null && <div><strong>TC#2 RPM:</strong> {reportDetails.meTcRpm2}</div>}
            {reportDetails.meTcExhaustTempIn !== null && <div><strong>TC Exh In:</strong> {reportDetails.meTcExhaustTempIn} °C</div>}
            {reportDetails.meTcExhaustTempOut !== null && <div><strong>TC Exh Out:</strong> {reportDetails.meTcExhaustTempOut} °C</div>}
            {reportDetails.meThrustBearingTemp !== null && <div><strong>Thrust Brg:</strong> {reportDetails.meThrustBearingTemp?.toFixed(1)} °C</div>}
            {/* ME Daily Run Hours moved to Performance section */}
            {/* {reportDetails.meDailyRunHours !== null && <div><strong>ME Daily Run:</strong> {reportDetails.meDailyRunHours?.toFixed(1)} hrs</div>} */}
            {/* Added RPM and Speed */}
            {reportDetails.mePresentRpm !== null && <div><strong>Present RPM:</strong> {reportDetails.mePresentRpm?.toFixed(1)}</div>}
              {reportDetails.meCurrentSpeed !== null && <div><strong>Current Speed:</strong> {reportDetails.meCurrentSpeed?.toFixed(1)} knots</div>}
            </div>
          </section>
        )}

        {/* --- Machinery Engine Units --- Conditionally render this whole section */}
        {reportDetails.reportType !== 'berth' && reportDetails.engineUnits && reportDetails.engineUnits.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Engine Units</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Unit #</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Exh. Temp (°C)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Und. Piston Air</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">PCO Outlet (°C)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">JCFW Outlet (°C)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportDetails.engineUnits.map((unit) => (
                    <tr key={unit.id || unit.unitNumber}>
                      <td className="px-3 py-2 whitespace-nowrap">{unit.unitNumber}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{unit.exhaustTemp ?? '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{unit.underPistonAir ?? '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{unit.pcoOutletTemp ?? '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{unit.jcfwOutletTemp ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* --- Machinery Aux Engines --- */}
        {reportDetails.auxEngines && reportDetails.auxEngines.length > 0 && (
           <section>
            <h3 className="text-lg font-semibold border-b pb-2 mb-3 text-gray-700">Auxiliary Engines</h3>
             <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Load (%)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">KW</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">FO Press (bar)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">LO Press (bar)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Water Temp (°C)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Daily Run (hrs)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportDetails.auxEngines.map((aux) => (
                    <tr key={aux.id || aux.engineName}>
                      <td className="px-3 py-2 whitespace-nowrap font-medium">{aux.engineName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{aux.load ?? '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{aux.kw ?? '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{aux.foPress ?? '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{aux.lubOilPress ?? '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{aux.waterTemp ?? '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{aux.dailyRunHour ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>

      {/* Review Actions - Only show if report is pending */}
      {reportDetails.status === 'pending' && (
        <div className="bg-white p-6 rounded-lg shadow">
           <h2 className="text-xl font-semibold mb-4">Review Action</h2>
           
           {/* Checklist for 'Changes Requested' - only for Departure reports initially */}
           {reportDetails.reportType === 'departure' && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Request Modifications (Check items to allow captain to edit):</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto border p-3 rounded">
                {currentChecklist.map(item => (
                  <div key={item.id} className="flex items-center">
                    <input
                      id={`checklist-${item.id}`}
                      name={`checklist-${item.id}`}
                      type="checkbox"
                      checked={selectedChecklistItems.includes(item.id)}
                      onChange={() => handleChecklistItemChange(item.id)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      disabled={isSubmitting}
                    />
                    <label htmlFor={`checklist-${item.id}`} className="ml-2 block text-sm text-gray-900">
                      {item.label} <span className="text-xs text-gray-500">({item.category})</span>
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label htmlFor="requestedChangesComment" className="block text-sm font-medium text-gray-700 mb-1">
                  Comments for Captain (Regarding Changes)
                </label>
                <textarea
                  id="requestedChangesComment"
                  rows={3}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  value={requestedChangesComment}
                  onChange={(e) => setRequestedChangesComment(e.target.value)}
                  placeholder="e.g., Please verify FASP coordinates and ME LSIFO consumption."
                  disabled={isSubmitting}
                />
              </div>
            </div>
           )}

           <div className="mb-4">
            <label htmlFor="reviewComments" className="block text-sm font-medium text-gray-700 mb-1">
               General Review Comments (Optional, for Approve/Reject)
            </label>
            <textarea
               id="reviewComments"
               rows={3}
               className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
               value={reviewComments}
               onChange={(e) => setReviewComments(e.target.value)}
               disabled={isSubmitting}
            />
         </div>

         {submitError && <p className="text-red-600 mb-4">{submitError}</p>}

         <div className="flex flex-wrap justify-end space-x-0 sm:space-x-4 space-y-2 sm:space-y-0">
            <button
               onClick={() => handleReviewSubmit('rejected')}
               disabled={isSubmitting}
               className={`w-full sm:w-auto px-4 py-2 rounded-md text-white font-medium transition duration-150 ease-in-out mb-2 sm:mb-0 ${
                  isSubmitting
                     ? 'bg-red-300 cursor-not-allowed'
                     : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
               }`}
            >
               {isSubmitting ? 'Submitting...' : 'Reject'}
            </button>
            {/* "Request Changes" button - only for Departure reports initially */}
            {reportDetails.reportType === 'departure' && (
              <button
                onClick={() => handleReviewSubmit('changes_requested')}
                disabled={isSubmitting || selectedChecklistItems.length === 0} // Disable if no checklist items selected
                className={`w-full sm:w-auto px-4 py-2 rounded-md text-white font-medium transition duration-150 ease-in-out mb-2 sm:mb-0 ${
                  (isSubmitting || selectedChecklistItems.length === 0)
                      ? 'bg-orange-300 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400'
                }`}
                title={selectedChecklistItems.length === 0 ? "Select at least one item from the checklist to request changes" : ""}
              >
                {isSubmitting ? 'Submitting...' : 'Request Changes'}
              </button>
            )}
            <button
               onClick={() => handleReviewSubmit('approved')}
               disabled={isSubmitting}
                className={`w-full sm:w-auto px-4 py-2 rounded-md text-white font-medium transition duration-150 ease-in-out ${
                  isSubmitting
                     ? 'bg-green-300 cursor-not-allowed'
                     : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
               }`}
            >
               {isSubmitting ? 'Submitting...' : 'Approve'}
            </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReportReviewPage;
