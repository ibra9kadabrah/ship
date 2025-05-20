import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
// Import necessary types including machinery
import { BerthFormData, CardinalDirection, CurrentVoyageDetails, CargoStatus, AuxEngineData, FullReportViewDTO, ReportAuxEngine } from '../../types/report'; // Added ReportAuxEngine
import { useNavigate } from 'react-router-dom';
import { berthChecklistItems, ChecklistItem } from '../../config/reportChecklists'; // Corrected import path and added ChecklistItem
// Removed BunkerConsumptionSection, MachineryMEParamsSection, EngineUnitsSection imports
import BunkerSupplySection from './sections/BunkerSupplySection';
import AuxEnginesSection from './sections/AuxEnginesSection';
import CoordinateInputGroup from './CoordinateInputGroup'; // Import the new component

// Helper functions to initialize machinery data (copied from ArrivalForm)
// Removed initializeEngineUnits function

const initializeAuxEngines = (): AuxEngineData[] => {
  const names = ['DG1', 'DG2', 'V1'];
  return names.map(name => ({
    engineName: name,
    load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: ''
  }));
};


interface BerthFormProps {
  reportIdToModify?: string;
  initialData?: FullReportViewDTO; // Used if page is loaded directly in modify mode with pre-fetched data
  // Add props for checklist and comments passed from modification page
  activeModificationChecklistFromPage?: string[];
  officeChangesCommentFromPage?: string | null;
}

const BerthForm: React.FC<BerthFormProps> = ({
  reportIdToModify,
  initialData,
  activeModificationChecklistFromPage,
  officeChangesCommentFromPage
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Modification mode states
  const [isModifyMode, setIsModifyMode] = useState<boolean>(!!reportIdToModify);
  const [initialReportData, setInitialReportData] = useState<FullReportViewDTO | null>(initialData || null);
  // Initialize with prop from page if available, otherwise default to empty/null
  const [activeModificationChecklist, setActiveModificationChecklist] = useState<string[]>(activeModificationChecklistFromPage || []);
  const [officeChangesComment, setOfficeChangesComment] = useState<string | null>(officeChangesCommentFromPage || null);
  const [isLoadingReportToModify, setIsLoadingReportToModify] = useState<boolean>(false);

  // Existing states
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [voyageDetails, setVoyageDetails] = useState<CurrentVoyageDetails | null>(null);
  const [formData, setFormData] = useState<BerthFormData>({
    reportType: 'berth',
    vesselId: '', // Set after fetching vessel info
    reportDate: '',
    reportTime: '',
    timeZone: '',
    // Berth Data
    berthDate: '', berthTime: '', 
    berthLatDeg: '', berthLatMin: '', berthLatDir: 'N', // Replaced berthLatitude
    berthLonDeg: '', berthLonMin: '', berthLonDir: 'E', // Replaced berthLongitude
    berthNumber: '', // Added Berth Number
    // Cargo Ops Data
    cargoOpsStartDate: '', cargoOpsStartTime: '', cargoOpsEndDate: '', cargoOpsEndTime: '',
    cargoLoaded: '', // Conditional
    cargoUnloaded: '', // Conditional
    // Weather
    windDirection: 'N', seaDirection: 'N', swellDirection: 'N',
    windForce: '', seaState: '', swellHeight: '',
    // Bunkers (Consumption) - REMOVED
    // meConsumptionLsifo: '', meConsumptionLsmgo: '', meConsumptionCylOil: '', meConsumptionMeOil: '', meConsumptionAeOil: '',
    boilerConsumptionLsifo: '', boilerConsumptionLsmgo: '', // Keep Boiler/Aux consumption for now, might be needed by Aux section? Revisit if Aux section needs update.
    auxConsumptionLsifo: '', auxConsumptionLsmgo: '', // Keep Boiler/Aux consumption for now
    // Bunkers (Supply)
    supplyLsifo: '', supplyLsmgo: '', supplyCylOil: '', supplyMeOil: '', supplyAeOil: '',
    // Machinery (ME Params) - REMOVED
    // meFoPressure: '', meLubOilPressure: '', meFwInletTemp: '', meLoInletTemp: '', meScavengeAirTemp: '',
    // meTcRpm1: '', meTcRpm2: '', meTcExhaustTempIn: '', meTcExhaustTempOut: '', meThrustBearingTemp: '', meDailyRunHours: '',
    // mePresentRpm: '',
    // meCurrentSpeed: '',
    // Initialize machinery arrays
    // engineUnits removed
    auxEngines: initializeAuxEngines(),
  });
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Helper function to map FullReportViewDTO to BerthFormData
  const mapReportToBerthFormData = (report: FullReportViewDTO): BerthFormData => {
    return {
      reportType: 'berth',
      vesselId: report.vesselId,
      reportDate: report.reportDate.split('T')[0], // Format date
      reportTime: report.reportTime,
      timeZone: report.timeZone,

      // Berth Specific Data
      berthDate: report.berthDate?.split('T')[0] || '',
      berthTime: report.berthTime || '',
      berthLatDeg: report.berthLatDeg?.toString() || '',
      berthLatMin: report.berthLatMin?.toString() || '',
      berthLatDir: report.berthLatDir || 'N',
      berthLonDeg: report.berthLonDeg?.toString() || '',
      berthLonMin: report.berthLonMin?.toString() || '',
      berthLonDir: report.berthLonDir || 'E',
      berthNumber: report.berthNumber || '',

      // Cargo Ops Data
      cargoOpsStartDate: report.cargoOpsStartDate?.split('T')[0] || '',
      cargoOpsStartTime: report.cargoOpsStartTime || '',
      cargoOpsEndDate: report.cargoOpsEndDate?.split('T')[0] || '',
      cargoOpsEndTime: report.cargoOpsEndTime || '',
      cargoLoaded: report.cargoLoaded?.toString() || '', // Convert number to string for form
      cargoUnloaded: report.cargoUnloaded?.toString() || '', // Convert number to string for form

      // Weather
      windDirection: report.windDirection || 'N',
      windForce: report.windForce?.toString() || '',
      seaDirection: report.seaDirection || 'N',
      seaState: report.seaState?.toString() || '',
      swellDirection: report.swellDirection || 'N',
      swellHeight: report.swellHeight?.toString() || '',

      // Bunkers (Consumption) - ME is N/A for Berth, Boiler/Aux are relevant
      boilerConsumptionLsifo: report.boilerConsumptionLsifo?.toString() || '',
      boilerConsumptionLsmgo: report.boilerConsumptionLsmgo?.toString() || '',
      auxConsumptionLsifo: report.auxConsumptionLsifo?.toString() || '',
      auxConsumptionLsmgo: report.auxConsumptionLsmgo?.toString() || '',
      // ME Consumption fields from BaseReportFormData that are not applicable to Berth
      // but might be expected by shared components if not handled carefully.
      // For BerthForm, these are not directly used but mapping them defensively.
      meConsumptionLsifo: report.meConsumptionLsifo?.toString() || '',
      meConsumptionLsmgo: report.meConsumptionLsmgo?.toString() || '',
      meConsumptionCylOil: report.meConsumptionCylOil?.toString() || '',
      meConsumptionMeOil: report.meConsumptionMeOil?.toString() || '',
      meConsumptionAeOil: report.meConsumptionAeOil?.toString() || '',

      // Bunkers (Supply)
      supplyLsifo: report.supplyLsifo?.toString() || '',
      supplyLsmgo: report.supplyLsmgo?.toString() || '',
      supplyCylOil: report.supplyCylOil?.toString() || '',
      supplyMeOil: report.supplyMeOil?.toString() || '',
      supplyAeOil: report.supplyAeOil?.toString() || '',

      // Machinery (ME Params) - N/A for Berth. Map from FullReportViewDTO if present.
      meFoPressure: report.meFoPressure?.toString() || '',
      meLubOilPressure: report.meLubOilPressure?.toString() || '',
      meFwInletTemp: report.meFwInletTemp?.toString() || '',
      meLoInletTemp: report.meLoInletTemp?.toString() || '',
      meScavengeAirTemp: report.meScavengeAirTemp?.toString() || '',
      meTcRpm1: report.meTcRpm1?.toString() || '',
      meTcRpm2: report.meTcRpm2?.toString() || '',
      meTcExhaustTempIn: report.meTcExhaustTempIn?.toString() || '',
      meTcExhaustTempOut: report.meTcExhaustTempOut?.toString() || '',
      meThrustBearingTemp: report.meThrustBearingTemp?.toString() || '',
      meDailyRunHours: report.meDailyRunHours?.toString() || '',
      mePresentRpm: report.mePresentRpm?.toString() || '',
      meCurrentSpeed: report.meCurrentSpeed?.toString() || '',

      // Aux Engines (FullReportViewDTO has auxEngines: ReportAuxEngine[])
      auxEngines: report.auxEngines?.map((ae: import('../../types/report').ReportAuxEngine): AuxEngineData => ({
        engineName: ae.engineName,
        load: ae.load?.toString() || '',
        kw: ae.kw?.toString() || '',
        foPress: ae.foPress?.toString() || '',
        lubOilPress: ae.lubOilPress?.toString() || '',
        waterTemp: ae.waterTemp?.toString() || '',
        dailyRunHour: ae.dailyRunHour?.toString() || '',
      })) || initializeAuxEngines(),
      // engineUnits are not part of BerthFormData
    };
  };

  // --- Modification Mode Helper Functions ---
  const isFieldEditable = (fieldName: string): boolean => {
    if (!isModifyMode) return true; // All fields editable if not in modify mode
    if (activeModificationChecklist.length === 0) return false; // No fields editable if no checklist items selected

    // Check if the fieldName is affected by any of the active checklist items
    return berthChecklistItems.some((item: ChecklistItem) =>
      activeModificationChecklist.includes(item.id) && item.fields_affected.includes(fieldName)
    );
  };

  const isSectionEditable = (sectionId: string): boolean => {
    if (!isModifyMode) return true;
    if (activeModificationChecklist.length === 0) return false;

    // Check if the sectionId (which corresponds to a checklist item id) is in the active list
    // This is a simpler check if a whole section is controlled by one checklist item.
    // For more granular control, iterate fields within the section using isFieldEditable.
    const sectionChecklistItem = berthChecklistItems.find((item: ChecklistItem) => item.id === sectionId);
    if (!sectionChecklistItem) return false; // Section ID not found in checklist config

    return activeModificationChecklist.includes(sectionId);
  };
  // --- End Modification Mode Helper Functions ---

  // Fetch vessel info and voyage details (runs on initial load)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null); // Reset error on new fetch attempt
      try {
        // Fetch vessel info first
        // Corrected path: remove '/api' prefix as it's in baseURL
        const vesselResponse = await apiClient.get<VesselInfo>('/vessels/my-vessel'); 
        setVesselInfo(vesselResponse.data);
        setFormData(prev => ({ ...prev, vesselId: vesselResponse.data.id }));

        // Then fetch current voyage details
        try {
            // Corrected path: remove '/api' prefix as it's in baseURL
            const voyageResponse = await apiClient.get<CurrentVoyageDetails>('/voyages/current/details'); 
            setVoyageDetails(voyageResponse.data);
        } catch (voyageErr: any) {
             if (voyageErr.response && voyageErr.response.status === 404) {
                 setError('No active voyage found. Cannot submit Berth Report.');
             } else {
                 setError('Failed to fetch active voyage details.');
                 console.error('Voyage fetch error:', voyageErr);
             }
             setVoyageDetails(null); // Ensure voyage details are null on error
        }

      } catch (vesselErr) {
        setError('Failed to fetch vessel information.');
        console.error('Vessel fetch error:', vesselErr);
        setVesselInfo(null); // Ensure vessel info is null on error
        setVoyageDetails(null); // Ensure voyage details are null if vessel fetch fails
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Effect for fetching report data in modification mode
  useEffect(() => {
    if (isModifyMode && reportIdToModify && !initialReportData) {
      const fetchReportToModify = async () => {
        setIsLoadingReportToModify(true);
        setError(null);
        try {
          // Corrected path: remove '/api' prefix as it's in baseURL
          const response = await apiClient.get<FullReportViewDTO>(`/reports/${reportIdToModify}`);
          const reportData = response.data;
          setInitialReportData(reportData);
          setFormData(mapReportToBerthFormData(reportData));
          
          // Extract checklist and comment from the fetched report
          // Only set if not already provided by props (props take precedence)
          if (!activeModificationChecklistFromPage && reportData.status === 'changes_requested' && reportData.modification_checklist) {
            setActiveModificationChecklist(reportData.modification_checklist);
          }
          if (!officeChangesCommentFromPage && reportData.status === 'changes_requested' && reportData.requested_changes_comment) {
            setOfficeChangesComment(reportData.requested_changes_comment);
          }

        } catch (err: any) {
          console.error('Failed to fetch report for modification:', err);
          setError(err.response?.data?.message || 'Failed to load report data for modification.');
          // Potentially navigate away or disable form if critical data fails to load
          navigate('/captain', { replace: true, state: { error: 'Failed to load report for modification.' } });
        } finally {
          setIsLoadingReportToModify(false);
        }
      };
      fetchReportToModify();
    } else if (isModifyMode && initialReportData) {
      // If initialData was provided via props, map it
      setFormData(mapReportToBerthFormData(initialReportData));
      // If initialData was provided via props, and props for checklist/comment were not, set them from initialData
      if (!activeModificationChecklistFromPage && initialReportData.status === 'changes_requested' && initialReportData.modification_checklist) {
        setActiveModificationChecklist(initialReportData.modification_checklist);
      }
      if (!officeChangesCommentFromPage && initialReportData.status === 'changes_requested' && initialReportData.requested_changes_comment) {
        setOfficeChangesComment(initialReportData.requested_changes_comment);
      }
    }
  }, [isModifyMode, reportIdToModify, initialReportData, navigate]); // Added initialReportData and navigate to dependencies


  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Handle direction selects specifically
    if (name.endsWith('LatDir') || name.endsWith('LonDir')) {
        setFormData(prev => ({ ...prev, [name]: value as 'N' | 'S' | 'E' | 'W' }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Specific handlers for CoordinateInputGroup
  const handleCoordinateChange = (
    prefix: 'berthLat' | 'berthLon', 
    part: 'Deg' | 'Min' | 'Dir', 
    value: string
  ) => {
    const name = `${prefix}${part}`;
    if (part === 'Dir') {
      setFormData(prev => ({ ...prev, [name]: value as 'N' | 'S' | 'E' | 'W' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handlers for nested machinery data (copied from ArrivalForm)
  // handleEngineUnitChange removed

  const handleAuxEngineChange = (index: number, field: keyof Omit<AuxEngineData, 'engineName'>, value: string) => {
     setFormData(prev => {
      const updatedAux = [...(prev.auxEngines || [])]; // Use initializers if needed
      if (updatedAux[index]) {
        updatedAux[index] = { ...updatedAux[index], [field]: value };
      }
      return { ...prev, auxEngines: updatedAux };
    });
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!voyageDetails) {
        setError('Cannot submit: Active voyage details are missing.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // --- Input Format Validation ---
    const errors: string[] = [];
    const numericFields: (keyof BerthFormData)[] = [ // Define list of numeric fields
        'berthLatDeg', 'berthLatMin', 'berthLonDeg', 'berthLonMin', // Replaced Lat/Lon
        'cargoLoaded', 'cargoUnloaded', // Conditional, validate if present
        'windForce', 'seaState', 'swellHeight',
        // ME Consumption removed
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo', // Keep Boiler/Aux consumption
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        // ME Params removed
    ];
    // No string-only fields specific to Berth form

    // Validate standard numeric fields
    numericFields.forEach(field => {
        const value = formData[field as keyof BerthFormData];
        // Allow empty strings for optional fields (like meTcRpm2, cargoLoaded/Unloaded), but fail if non-empty and not numeric
        if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
             // Special check for conditional cargo fields - only error if the state requires them
            // Both fields are optional now, only validate if non-empty
            errors.push(`${field} must be a valid number.`);
        }
    });

    // Validate Engine Units (numeric) - REMOVED

    // Validate Aux Engines (numeric)
    formData.auxEngines?.forEach((aux, index) => {
        Object.entries(aux).forEach(([key, value]) => {
            if (key !== 'engineName' && value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
                errors.push(`Aux Engine ${aux.engineName} ${key} must be a valid number.`);
            }
        });
    });

    if (errors.length > 0) {
        setError(errors.join(' '));
        setIsLoading(false);
        return;
    }
    // --- End Input Format Validation ---


    // Basic Client-side validation (Required Fields)
    const requiredFields: (keyof BerthFormData)[] = [
        'reportDate', 'reportTime', 'timeZone',
        'berthDate', 'berthTime', 'berthNumber', // Added berthNumber
        'berthLatDeg', 'berthLatMin', 'berthLatDir', // Replaced Lat/Lon
        'berthLonDeg', 'berthLonMin', 'berthLonDir', // Replaced Lat/Lon
        'cargoOpsStartDate', 'cargoOpsStartTime', 'cargoOpsEndDate', 'cargoOpsEndTime',
        // Required ME Params removed
        // Note: Bunkers consumption/supply are also required by BaseReportFormData
        // Keep Boiler/Aux consumption required for now, rely on backend validation primarily
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo', // Explicitly add these? Or rely on backend? Let's rely on backend for now.
        // Cargo loaded/unloaded are now optional from frontend perspective
    ];

    for (const field of requiredFields) {
        // Check if the field exists in formData and is not empty/null/undefined
        // Allow 0 as a valid number
        const value = formData[field];
        if (value === undefined || value === null || value === '') { 
            setError(`Field "${field}" is required.`);
            setIsLoading(false);
            return;
        }
    }

    // Prepare payload: Convert numbers
    const payload: any = { ...formData }; 

    // Default empty cargo fields to 0 before numeric conversion
    if (payload.cargoLoaded === '' || payload.cargoLoaded === null || payload.cargoLoaded === undefined) {
        payload.cargoLoaded = 0;
    }
    if (payload.cargoUnloaded === '' || payload.cargoUnloaded === null || payload.cargoUnloaded === undefined) {
        payload.cargoUnloaded = 0;
    }

    // Use the *same* numericFields array defined above for conversion
    numericFields.forEach(field => {
        // Check if field exists in payload before processing (cargoLoaded/Unloaded might be deleted)
        // Use type assertion for safer access
        const key = field as keyof BerthFormData; 
        if (payload[key] !== undefined) {
            if (payload[key] !== '' && payload[key] !== null) {
                payload[key] = parseFloat(payload[key] as string);
                 if (isNaN(payload[key])) {
                     console.warn(`Could not parse numeric field: ${key}, value: ${formData[key]}`); // Log original value
                     payload[key] = null; 
                }
            } else {
                 payload[key] = null; 
            }
        }
    });
    
    // Convert machinery fields (copied from ArrivalForm)
     // payload.engineUnits conversion removed
     payload.auxEngines = payload.auxEngines?.map((aux: AuxEngineData) => { // Add explicit type
        const convertedAux = { ...aux };
        const auxNumericFields: (keyof Omit<AuxEngineData, 'engineName'>)[] = ['load', 'kw', 'foPress', 'lubOilPress', 'waterTemp', 'dailyRunHour'];
         auxNumericFields.forEach(field => {
            if (convertedAux[field] !== '' && convertedAux[field] !== undefined && convertedAux[field] !== null) {
                (convertedAux as any)[field] = parseFloat(convertedAux[field] as string);
                 if (isNaN((convertedAux as any)[field])) (convertedAux as any)[field] = null;
            } else {
                 (convertedAux as any)[field] = null;
            }
        });
        return convertedAux;
    });


    try {
      if (isModifyMode && reportIdToModify) {
        // Prepare payload with only editable fields for resubmission
        const resubmitPayload: Partial<BerthFormData> & { modification_checklist?: string[]; requested_changes_comment?: string | null } = {
          reportType: 'berth', // Essential for backend routing/validation
          vesselId: formData.vesselId, // Also essential
        };

        // Include office changes comment and checklist
        // These might be sent to a different DTO field on backend like `reviewContext`
        // For now, sending as per typical modification pattern.
        // The backend /resubmit endpoint should expect these or similar.
        resubmitPayload.requested_changes_comment = officeChangesComment;
        resubmitPayload.modification_checklist = activeModificationChecklist;

        // Iterate over formData keys and add to payload if editable
        (Object.keys(formData) as Array<keyof BerthFormData>).forEach(key => {
          if (isFieldEditable(key)) {
            // Use the already validated and parsed value from the main 'payload' object
            // which has numeric conversions done.
            if (payload[key] !== undefined) {
               (resubmitPayload as any)[key] = payload[key];
            }
          }
        });
        
        // Ensure auxEngines are included if the section was editable
        // The `isFieldEditable('auxEngines')` check relies on the checklist item `berth_machinery_aux_engines`
        if (isFieldEditable('auxEngines') && payload.auxEngines) {
            resubmitPayload.auxEngines = payload.auxEngines;
        }

        await apiClient.patch(`/reports/${reportIdToModify}/resubmit`, resubmitPayload);
        setSuccess('Berth report resubmitted successfully!');
        setTimeout(() => navigate('/captain'), 1500);
      } else {
        // Original submission logic
        await apiClient.post('/reports', payload as BerthFormData);
        setSuccess('Berth report submitted successfully!');
        setTimeout(() => navigate('/captain'), 1500);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit report.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render Vessel Info
  const renderVesselInfo = () => {
    // Show loading only if vesselInfo is null AND isLoading is true
    if (isLoading && !vesselInfo) return <p>Loading vessel info...</p>; 
    if (!vesselInfo) return null; // Don't render if info couldn't be fetched but loading is done

    return (
      <div className="mb-4 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold text-lg mb-2">Vessel Information</h3>
        <p><strong>Name:</strong> {vesselInfo.name}</p>
        <p><strong>IMO:</strong> {vesselInfo.imoNumber}</p>
        <p><strong>DWT:</strong> {vesselInfo.deadweight}</p>
        {user && <p><strong>Captain:</strong> {user.name}</p>}
      </div>
    );
  };
  
   // Render Voyage Info (including initial cargo status)
   const renderVoyageInfo = () => {
     // Show loading only if voyageDetails is null AND isLoading is true
     if (isLoading && !voyageDetails) return <p>Loading voyage details...</p>; 
     if (!voyageDetails) return null; // Don't render if details couldn't be fetched

     return (
       <div className="mb-4 p-4 border rounded bg-blue-50 border-blue-200">
         <h3 className="font-semibold text-lg mb-2 text-blue-800">Active Voyage Context</h3>
         <p><strong>Voyage ID:</strong> {voyageDetails.voyageId}</p>
         <p><strong>Departure:</strong> {voyageDetails.departurePort}</p>
         <p><strong>Destination:</strong> {voyageDetails.destinationPort}</p>
         <p><strong>Initial Cargo Status:</strong> <span className={`font-medium ${voyageDetails.initialCargoStatus === 'Loaded' ? 'text-green-700' : 'text-orange-700'}`}>{voyageDetails.initialCargoStatus}</span></p>
       </div>
     );
   };

  return (
    // Removed outer div max-w-4xl mx-auto p-4 as layout likely handles it
    <> 
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Berth Report</h2> {/* Match DepartureForm h2 */}
      {renderVesselInfo()}
      {renderVoyageInfo()} 

      {/* Show main error prominently if voyage details failed */}
       {error && !isLoading && <p className="text-red-600 mb-4 p-3 bg-red-100 rounded">{error}</p>}

      {/* Only show form if vessel and voyage details loaded successfully */}
      {!isLoading && vesselInfo && voyageDetails && (
      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md"> {/* Consistent form class */}
        
        {/* Display Office Change Request Information */}
        {isModifyMode && (officeChangesComment || activeModificationChecklist.length > 0) && (
          <div className="mb-6 p-4 border border-orange-300 bg-orange-50 rounded-md shadow-sm">
            <h3 className="text-lg font-semibold text-orange-700 mb-2">Office Change Request</h3>
            {officeChangesComment && (
              <p className="text-sm text-orange-600 mb-3 whitespace-pre-wrap">
                <strong>Comment:</strong> {officeChangesComment}
              </p>
            )}
            {activeModificationChecklist.length > 0 && (
              <div>
                <p className="text-sm font-medium text-orange-600 mb-1"><strong>Requested Changes:</strong></p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  {activeModificationChecklist.map(itemId => {
                    const itemDetail = berthChecklistItems.find(ci => ci.id === itemId);
                    return (
                      <li key={itemId} className="text-sm text-orange-600">
                        {itemDetail ? itemDetail.label : itemId}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

      {/* General Information Section */}
      <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
        <legend className="text-lg font-medium px-2">General Info</legend> {/* Consistent legend class & text */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Consistent grid */}
          <div><label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">Report Date</label><input type="date" id="reportDate" name="reportDate" value={formData.reportDate} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('reportDate') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('reportDate')}/></div>
          <div><label htmlFor="reportTime" className="block text-sm font-medium text-gray-700">Report Time</label><input type="time" id="reportTime" name="reportTime" value={formData.reportTime} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('reportTime') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('reportTime')}/></div>
          <div><label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">Time Zone</label><input type="text" id="timeZone" name="timeZone" value={formData.timeZone} onChange={handleChange} required placeholder="e.g., UTC+3" className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('timeZone') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('timeZone')}/></div>
        </div>
      </fieldset>

          {/* Berth Details Section */}
          <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
            <legend className="text-lg font-medium px-2">Berth Details</legend> {/* Consistent legend class */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"> {/* Date/Time */}
               <div><label htmlFor="berthDate" className="block text-sm font-medium text-gray-700">Berth Date</label><input type="date" id="berthDate" name="berthDate" value={formData.berthDate} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('berthDate') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('berthDate')}/></div>
               <div><label htmlFor="berthTime" className="block text-sm font-medium text-gray-700">Berth Time</label><input type="time" id="berthTime" name="berthTime" value={formData.berthTime} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('berthTime') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('berthTime')}/></div>
             </div>
             {/* Replace Berth Lat/Lon inputs with CoordinateInputGroup */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <CoordinateInputGroup
                    label="Berth Latitude"
                    idPrefix="berthLat"
                    degreeValue={formData.berthLatDeg ?? ''}
                    minuteValue={formData.berthLatMin ?? ''}
                    directionValue={formData.berthLatDir ?? 'N'}
                    onDegreeChange={(e) => handleCoordinateChange('berthLat', 'Deg', e.target.value)}
                    onMinuteChange={(e) => handleCoordinateChange('berthLat', 'Min', e.target.value)}
                    onDirectionChange={(e) => handleCoordinateChange('berthLat', 'Dir', e.target.value)}
                    directionOptions={['N', 'S']}
                    required={true}
                    disabled={isModifyMode && !isSectionEditable('berth_location_details')}
                 />
                 <CoordinateInputGroup
                    label="Berth Longitude"
                    idPrefix="berthLon"
                    degreeValue={formData.berthLonDeg ?? ''}
                    minuteValue={formData.berthLonMin ?? ''}
                    directionValue={formData.berthLonDir ?? 'E'}
                    onDegreeChange={(e) => handleCoordinateChange('berthLon', 'Deg', e.target.value)}
                    onMinuteChange={(e) => handleCoordinateChange('berthLon', 'Min', e.target.value)}
                    onDirectionChange={(e) => handleCoordinateChange('berthLon', 'Dir', e.target.value)}
                    directionOptions={['E', 'W']}
                    required={true}
                    disabled={isModifyMode && !isSectionEditable('berth_location_details')}
                 />
             </div>
             {/* Add Berth Number Input */}
             <div className="mt-4">
                <label htmlFor="berthNumber" className="block text-sm font-medium text-gray-700">Berth Number</label>
                <input type="text" id="berthNumber" name="berthNumber" value={formData.berthNumber} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('berthNumber') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('berthNumber')}/>
             </div>
          </fieldset>

          {/* Cargo Operations Section */}
          <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
            <legend className="text-lg font-medium px-2">Cargo Operations</legend> {/* Consistent legend class */}
             {/* Always show both cargo fields, adjust grid */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4"> {/* Use 4 columns for cargo + dates */}
                 {/* Cargo Loaded */}
                 <div>
                    <label htmlFor="cargoLoaded" className="block text-sm font-medium text-gray-700">Cargo Loaded (MT)</label>
                    <input type="number" step="0.01" id="cargoLoaded" name="cargoLoaded" value={formData.cargoLoaded ?? ''} onChange={handleChange} min="0" placeholder="0.00" className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('cargoLoaded') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('cargoLoaded')}/>
                </div>
                 {/* Cargo Unloaded */}
                 <div>
                    <label htmlFor="cargoUnloaded" className="block text-sm font-medium text-gray-700">Cargo Unloaded (MT)</label>
                    <input type="number" step="0.01" id="cargoUnloaded" name="cargoUnloaded" value={formData.cargoUnloaded ?? ''} onChange={handleChange} min="0" placeholder="0.00" className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('cargoUnloaded') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('cargoUnloaded')}/>
                </div>
                 {/* Cargo Ops Times - moved to next row or adjust grid */}
                 {/* Let's keep times below for clarity */}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> {/* New grid for times */}
                 <div><label htmlFor="cargoOpsStartDate" className="block text-sm font-medium text-gray-700">Ops Start Date</label><input type="date" id="cargoOpsStartDate" name="cargoOpsStartDate" value={formData.cargoOpsStartDate} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('cargoOpsStartDate') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('cargoOpsStartDate')}/></div>
                 <div><label htmlFor="cargoOpsStartTime" className="block text-sm font-medium text-gray-700">Ops Start Time</label><input type="time" id="cargoOpsStartTime" name="cargoOpsStartTime" value={formData.cargoOpsStartTime} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('cargoOpsStartTime') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('cargoOpsStartTime')}/></div>
                 <div><label htmlFor="cargoOpsEndDate" className="block text-sm font-medium text-gray-700">Ops End Date</label><input type="date" id="cargoOpsEndDate" name="cargoOpsEndDate" value={formData.cargoOpsEndDate} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('cargoOpsEndDate') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('cargoOpsEndDate')}/></div>
                 <div><label htmlFor="cargoOpsEndTime" className="block text-sm font-medium text-gray-700">Ops End Time</label><input type="time" id="cargoOpsEndTime" name="cargoOpsEndTime" value={formData.cargoOpsEndTime} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('cargoOpsEndTime') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('cargoOpsEndTime')}/></div>
             </div>
          </fieldset>

          {/* Weather Section */}
          <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
            <legend className="text-lg font-medium px-2">Weather</legend> {/* Consistent legend class */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Consistent grid */}
               {/* Consistent select/input (already match) */}
               <div><label htmlFor="windDirection" className="block text-sm font-medium text-gray-700">Wind Direction</label><select id="windDirection" name="windDirection" value={formData.windDirection} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${isModifyMode && !isFieldEditable('windDirection') ? 'bg-gray-100 cursor-not-allowed' : ''}`} disabled={isModifyMode && !isFieldEditable('windDirection')}>{['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}</select></div>
               
               <div><label htmlFor="windForce" className="block text-sm font-medium text-gray-700">Wind Force (Beaufort)</label><input type="number" id="windForce" name="windForce" value={formData.windForce} onChange={handleChange} required min="0" max="12" className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('windForce') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('windForce')}/></div>
               
               <div><label htmlFor="seaDirection" className="block text-sm font-medium text-gray-700">Sea Direction</label><select id="seaDirection" name="seaDirection" value={formData.seaDirection} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${isModifyMode && !isFieldEditable('seaDirection') ? 'bg-gray-100 cursor-not-allowed' : ''}`} disabled={isModifyMode && !isFieldEditable('seaDirection')}>{['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}</select></div>
               
               <div><label htmlFor="seaState" className="block text-sm font-medium text-gray-700">Sea State (Douglas Scale)</label><input type="number" id="seaState" name="seaState" value={formData.seaState} onChange={handleChange} required min="0" max="9" className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('seaState') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('seaState')}/></div>
               
               <div><label htmlFor="swellDirection" className="block text-sm font-medium text-gray-700">Swell Direction</label><select id="swellDirection" name="swellDirection" value={formData.swellDirection} onChange={handleChange} required className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${isModifyMode && !isFieldEditable('swellDirection') ? 'bg-gray-100 cursor-not-allowed' : ''}`} disabled={isModifyMode && !isFieldEditable('swellDirection')}>{['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}</select></div>
               
               <div><label htmlFor="swellHeight" className="block text-sm font-medium text-gray-700">Swell Height (m)</label><input type="number" step="0.1" id="swellHeight" name="swellHeight" value={formData.swellHeight} onChange={handleChange} required min="0" className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('swellHeight') ? 'bg-gray-100 cursor-not-allowed' : ''}`} readOnly={isModifyMode && !isFieldEditable('swellHeight')}/></div>
             </div>
          </fieldset>

          <fieldset className="border p-4 rounded">
            <legend className="text-lg font-medium px-2">Bunkers</legend>
            {/* BunkerConsumptionSection removed */}
            <BunkerSupplySection
              formData={formData}
              handleChange={handleChange}
              title="Supply (Since Last)"
              disabled={isModifyMode && !isSectionEditable('berth_bunker_supplies')}
            />
          </fieldset>

          <fieldset className="border p-4 rounded">
            <legend className="text-lg font-medium px-2">Machinery</legend>
            {/* MachineryMEParamsSection removed */}
            {/* EngineUnitsSection removed */}
            <AuxEnginesSection
              auxEngines={formData.auxEngines || []}
              handleAuxEngineChange={handleAuxEngineChange}
              disabled={isModifyMode && !isSectionEditable('berth_machinery_aux_engines')}
            />
          </fieldset>


      {/* Submission Area */}
      <div className="pt-4"> {/* Keep pt-4 */}
        {error && !isLoading && <p className="text-red-600 mb-4">{error}</p>} {/* Keep error/success messages */}
        {success && <p className="text-green-600 mb-4">{success}</p>}
        {/* Match DepartureForm button style exactly */}
        <button
          type="submit"
          disabled={isLoading || isLoadingReportToModify || !vesselInfo || !voyageDetails}
          className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
            (isLoading || isLoadingReportToModify || !vesselInfo || !voyageDetails) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading || isLoadingReportToModify ? 'Submitting...' : (isModifyMode ? 'Resubmit Berth Report' : 'Submit Berth Report')}
        </button>
      </div>
    </form>
  )}
    </> // Close the fragment opened at the start
  );
};

export default BerthForm;
