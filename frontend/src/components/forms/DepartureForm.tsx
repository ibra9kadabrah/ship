import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api'; // Assuming getReportById is not needed here directly anymore
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
import { DepartureSpecificData, BaseReportFormData, CardinalDirection, CargoStatus, EngineUnitData, AuxEngineData, FullReportViewDTO, ReportType } from '../../types/report';
import { departureChecklistItems } from '../../config/reportChecklists';

// Existing Section Imports
import BunkerConsumptionSection from './sections/BunkerConsumptionSection';
import BunkerSupplySection from './sections/BunkerSupplySection';
import MachineryMEParamsSection from './sections/MachineryMEParamsSection';
import EngineUnitsSection from './sections/EngineUnitsSection';
import AuxEnginesSection from './sections/AuxEnginesSection';

// New Common Section Imports
import GeneralInfoSection from './sections/common/GeneralInfoSection';
import WeatherSection from './sections/common/WeatherSection';
import VesselInfoDisplay from './sections/common/VesselInfoDisplay';
import DistanceSection from './sections/common/DistanceSection';

// New Specialized Section Imports
import VoyageDetailsSection from './sections/specialized/VoyageDetailsSection';
import DraftsCargoSection from './sections/specialized/DraftsCargoSection';
import FASPSection from './sections/specialized/FASPSection';

// Utility Imports
import {
  validateNumericFields,
  validateRequiredFields,
  validateEngineUnits,
  validateAuxEngines,
  validateStringOnlyFields,
  validateTimeFormat,
  ValidationError,
} from '../../utils/formValidation';
import {
  mapReportToFormData as genericMapReportToFormData,
  prepareSubmissionPayload as genericPrepareSubmissionPayload,
  toStringOrEmpty,
  convertEngineUnitsToNumbers, // For use in prepareSubmissionPayload
  convertAuxEnginesToNumbers,  // For use in prepareSubmissionPayload
} from '../../utils/dataTransformation';
import {
  useModificationMode,
  createFieldEditabilityChecker,
  prepareModificationPayload, // For modified reports
} from '../../utils/modificationMode';

type DepartureFormData = Partial<BaseReportFormData & DepartureSpecificData>;

const initialEngineUnits: EngineUnitData[] = Array.from({ length: 8 }, (_, i) => ({
  unitNumber: i + 1, exhaustTemp: '', underPistonAir: '', pcoOutletTemp: '', jcfwOutletTemp: ''
}));
const initialAuxEngines: AuxEngineData[] = [
  { engineName: 'DG1', load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: '' },
  { engineName: 'DG2', load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: '' },
  { engineName: 'V1', load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: '' }
];

interface DepartureFormProps {
  reportIdToModify?: string;
}

interface PreviousVoyageFinalStateData {
  voyageId?: string; reportId?: string; reportType?: ReportType;
  cargoQuantity: number | null; cargoType: string | null; cargoStatus: CargoStatus | null;
  finalRobLsifo: number | null; finalRobLsmgo: number | null; finalRobCylOil: number | null;
  finalRobMeOil: number | null; finalRobAeOil: number | null; message?: string;
  lastPortOfCall?: string | null; // Added to match backend
}

// Define the initial state for the form data
const initialDepartureFormData: DepartureFormData = {
    reportType: 'departure',
    reportDate: '', reportTime: '', timeZone: '',
    departurePort: '', destinationPort: '', voyageDistance: '', etaDate: '', etaTime: '',
    fwdDraft: '', aftDraft: '', cargoQuantity: '', cargoType: '', cargoStatus: 'Loaded',
    faspDate: '', faspTime: '', faspLatDeg: '', faspLatMin: '', faspLatDir: 'N',
    faspLonDeg: '', faspLonMin: '', faspLonDir: 'E', faspCourse: '',
    harbourDistance: '', harbourTime: '',
    windDirection: 'N', seaDirection: 'N', swellDirection: 'N',
    windForce: '', seaState: '', swellHeight: '',
    meConsumptionLsifo: '', meConsumptionLsmgo: '', meConsumptionCylOil: '', meConsumptionMeOil: '', meConsumptionAeOil: '',
    boilerConsumptionLsifo: '', boilerConsumptionLsmgo: '', auxConsumptionLsifo: '', auxConsumptionLsmgo: '',
    supplyLsifo: '', supplyLsmgo: '', supplyCylOil: '', supplyMeOil: '', supplyAeOil: '',
    initialRobLsifo: '', initialRobLsmgo: '', initialRobCylOil: '', initialRobMeOil: '', initialRobAeOil: '',
    meFoPressure: '', meLubOilPressure: '', meFwInletTemp: '', meLoInletTemp: '', meScavengeAirTemp: '',
    meTcRpm1: '', meTcRpm2: '', meTcExhaustTempIn: '', meTcExhaustTempOut: '', meThrustBearingTemp: '', meDailyRunHours: '',
    mePresentRpm: '', meCurrentSpeed: '',
    engineUnits: initialEngineUnits,
    auxEngines: initialAuxEngines,
};


const DepartureForm: React.FC<DepartureFormProps> = ({ reportIdToModify: reportIdFromProps }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);

  const {
    isModifyMode,
    initialReportData,
    activeModificationChecklist,
    officeChangesComment,
    isLoadingReportToModify,
    error: modificationModeError,
  } = useModificationMode(reportIdFromProps);
  
  const isFieldEditable = createFieldEditabilityChecker(isModifyMode, activeModificationChecklist, departureChecklistItems);

  const [isLoadingVessel, setIsLoadingVessel] = useState(!isModifyMode);
  const [vesselError, setVesselError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [previousVoyageStateData, setPreviousVoyageStateData] = useState<PreviousVoyageFinalStateData | null>(null);
  const [isLoadingPreviousVoyageState, setIsLoadingPreviousVoyageState] = useState(!isModifyMode);
  const [previousVoyageStateError, setPreviousVoyageStateError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DepartureFormData>(initialDepartureFormData);

  useEffect(() => {
    if (user?.role === 'captain' && !isModifyMode) {
      const fetchVesselAndPrevState = async () => {
        setIsLoadingVessel(true); setIsLoadingPreviousVoyageState(true);
        setVesselError(null); setPreviousVoyageStateError(null);
        try {
          const vesselResponse = await apiClient.get<VesselInfo>('/vessels/my-vessel');
          setVesselInfo(vesselResponse.data);
          if (vesselResponse.data.id) {
            try {
              const prevStateResponse = await apiClient.get<PreviousVoyageFinalStateData>(`/vessels/${vesselResponse.data.id}/previous-voyage-final-state`);
              setPreviousVoyageStateData(prevStateResponse.data);
            } catch (prevStateErr: any) {
              setPreviousVoyageStateError(prevStateErr.response?.data?.error || "Failed to load previous voyage state.");
            }
          }
        } catch (err: any) {
          setVesselError(err.response?.data?.error || "Failed to load assigned vessel information.");
        } finally {
          setIsLoadingVessel(false); setIsLoadingPreviousVoyageState(false);
        }
      };
      fetchVesselAndPrevState();
    } else if (!isModifyMode) {
        setIsLoadingVessel(false); setIsLoadingPreviousVoyageState(false);
    }
  }, [user, isModifyMode]);

  useEffect(() => {
    if (isModifyMode && initialReportData) {
      const mappedData = genericMapReportToFormData(initialReportData, 'departure') as DepartureFormData;
      setFormData({
        ...initialDepartureFormData, // Start with full defaults
        ...mappedData, // Override with mapped data from fetched report
        engineUnits: mappedData.engineUnits || initialEngineUnits,
        auxEngines: mappedData.auxEngines || initialAuxEngines,
      });
    } else if (!isModifyMode) {
        setFormData(initialDepartureFormData); // Reset to initial state for new form
    }
  }, [isModifyMode, initialReportData]);

  useEffect(() => {
    if (!isModifyMode) {
      const updates: Partial<DepartureFormData> = {};
      // Prioritize vesselInfo.lastDestinationPort for departure port
      if (vesselInfo && vesselInfo.lastDestinationPort !== null && vesselInfo.lastDestinationPort !== undefined) {
        updates.departurePort = vesselInfo.lastDestinationPort;
      } else if (previousVoyageStateData && previousVoyageStateData.lastPortOfCall !== null && previousVoyageStateData.lastPortOfCall !== undefined) {
        // Fallback to previousVoyageStateData if vesselInfo doesn't have it (should be rare)
        updates.departurePort = previousVoyageStateData.lastPortOfCall;
      }

      // Pre-fill other fields from previousVoyageStateData if available
      if (previousVoyageStateData && !previousVoyageStateData.message) {
        if (previousVoyageStateData.cargoType !== null) updates.cargoType = previousVoyageStateData.cargoType;
        if (previousVoyageStateData.cargoQuantity !== null) updates.cargoQuantity = String(previousVoyageStateData.cargoQuantity);
        if (previousVoyageStateData.cargoStatus !== null) updates.cargoStatus = previousVoyageStateData.cargoStatus;
        if (previousVoyageStateData.finalRobLsifo !== null) updates.initialRobLsifo = String(previousVoyageStateData.finalRobLsifo);
        if (previousVoyageStateData.finalRobLsmgo !== null) updates.initialRobLsmgo = String(previousVoyageStateData.finalRobLsmgo);
        if (previousVoyageStateData.finalRobCylOil !== null) updates.initialRobCylOil = String(previousVoyageStateData.finalRobCylOil);
        if (previousVoyageStateData.finalRobMeOil !== null) updates.initialRobMeOil = String(previousVoyageStateData.finalRobMeOil);
        if (previousVoyageStateData.finalRobAeOil !== null) updates.initialRobAeOil = String(previousVoyageStateData.finalRobAeOil);
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [vesselInfo, previousVoyageStateData, isModifyMode]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const directionFields = ['faspLatDir', 'faspLonDir', 'windDirection', 'seaDirection', 'swellDirection'];
    const statusFields = ['cargoStatus'];

    if (directionFields.includes(name) || statusFields.includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value as any }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCoordinateChange = (prefix: 'faspLat' | 'faspLon', part: 'Deg' | 'Min' | 'Dir', value: string) => {
    const name = `${prefix}${part}`;
    if (part === 'Dir') {
      setFormData(prev => ({ ...prev, [name]: value as 'N' | 'S' | 'E' | 'W' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEngineUnitChange = (index: number, field: keyof Omit<EngineUnitData, 'unitNumber'>, value: string) => {
    setFormData(prev => {
      const updatedUnits = prev.engineUnits ? [...prev.engineUnits] : initialEngineUnits;
      if (updatedUnits[index]) {
        updatedUnits[index] = { ...updatedUnits[index], [field]: value };
      }
      return { ...prev, engineUnits: updatedUnits };
    });
  };

  const handleAuxEngineChange = (index: number, field: keyof Omit<AuxEngineData, 'engineName'>, value: string) => {
    setFormData(prev => {
      const updatedAux = prev.auxEngines ? [...prev.auxEngines] : initialAuxEngines;
      if (updatedAux[index]) {
        updatedAux[index] = { ...updatedAux[index], [field]: value };
      }
      return { ...prev, auxEngines: updatedAux };
    });
  };
  
  const showInitialRob = !isModifyMode && vesselInfo && vesselInfo.initialRobLsifo === null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isModifyMode && !vesselInfo) { setSubmitError("Vessel information not loaded."); return; }
    if (isModifyMode && !initialReportData) { setSubmitError("Original report data not loaded."); return; }
    setSubmitError(null); setSubmitSuccess(null); setIsSubmitting(true);

    let allValidationErrors: ValidationError[] = [];
    const requiredFieldsList: (keyof DepartureFormData)[] = [
        'reportDate', 'reportTime', 'timeZone', 'departurePort', 'destinationPort', 'voyageDistance', 
        'etaDate', 'etaTime', 'fwdDraft', 'aftDraft', 'cargoQuantity', 'cargoType', 'cargoStatus',
        'faspDate', 'faspTime', 'faspLatDeg', 'faspLatMin', 'faspLatDir', 'faspLonDeg', 'faspLonMin', 'faspLonDir', 'faspCourse',
        'harbourDistance', 'harbourTime', 'windForce', 'seaState', 'swellHeight', 
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp',
        'meTcRpm1', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours',
        'mePresentRpm', 'meCurrentSpeed'
    ];
    if (showInitialRob) {
        requiredFieldsList.push('initialRobLsifo', 'initialRobLsmgo', 'initialRobCylOil', 'initialRobMeOil', 'initialRobAeOil');
    }
    allValidationErrors.push(...validateRequiredFields(formData, requiredFieldsList as string[]));
    
    const numericFieldsList: string[] = [ /* Populate with all numeric field names as strings */
        'voyageDistance', 'fwdDraft', 'aftDraft', 'cargoQuantity', 'faspLatDeg', 'faspLatMin', 'faspLonDeg', 'faspLonMin', 'faspCourse',
        'harbourDistance', 'windForce', 'seaState', 'swellHeight', 'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil',
        'meConsumptionMeOil', 'meConsumptionAeOil', 'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo',
        'auxConsumptionLsmgo', 'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil', 'initialRobLsifo',
        'initialRobLsmgo', 'initialRobCylOil', 'initialRobMeOil', 'initialRobAeOil', 'meFoPressure', 'meLubOilPressure',
        'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp', 'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn',
        'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed'
    ];
    const optionalNumeric = ['meTcRpm2', 'initialRobLsifo', 'initialRobLsmgo', 'initialRobCylOil', 'initialRobMeOil', 'initialRobAeOil'];
    allValidationErrors.push(...validateNumericFields(formData, numericFieldsList, optionalNumeric));
    allValidationErrors.push(...validateStringOnlyFields(formData, ['departurePort', 'destinationPort', 'cargoType']));
    allValidationErrors.push(...validateTimeFormat(formData.harbourTime, 'harbourTime'));
    allValidationErrors.push(...validateEngineUnits(formData.engineUnits));
    allValidationErrors.push(...validateAuxEngines(formData.auxEngines));

    if (!isModifyMode && vesselInfo?.deadweight && formData.cargoQuantity) {
      const cqNum = Number(formData.cargoQuantity);
      if (!isNaN(cqNum) && cqNum > vesselInfo.deadweight) {
        allValidationErrors.push({ field: 'cargoQuantity', message: `Cargo Quantity cannot exceed DWT (${vesselInfo.deadweight} MT).`});
      }
    }

    if (allValidationErrors.length > 0) {
      setSubmitError(allValidationErrors.map(e => `${e.field}: ${e.message}`).join(' \n '));
      setIsSubmitting(false); return;
    }

    try {
      if (isModifyMode && reportIdFromProps && initialReportData) {
        // Ensure formData has reportType for prepareModificationPayload constraint
        const currentFormDataWithReportType = {
            ...formData,
            reportType: 'departure', // Correctly typed as 'departure'
            vesselId: initialReportData.vesselId // Ensure vesselId is present
        };

        // Cast currentFormDataWithReportType to the expected Partial<T> for the utility function
        const submissionPayload = prepareModificationPayload<DepartureSpecificData & BaseReportFormData>(
          currentFormDataWithReportType as Partial<DepartureSpecificData & BaseReportFormData>,
          initialReportData,
          activeModificationChecklist,
          departureChecklistItems,
          numericFieldsList as (keyof (DepartureSpecificData & BaseReportFormData))[],
          convertEngineUnitsToNumbers,
          convertAuxEnginesToNumbers
        );
        
        let actualChangesMade = false;
        for (const key in submissionPayload) {
            if (key !== 'reportType' && key !== 'vesselId') {
                 const typedKey = key as keyof DepartureFormData;
                 const initialMapped = genericMapReportToFormData(initialReportData, 'departure');
                 if (JSON.stringify(submissionPayload[typedKey]) !== JSON.stringify(initialMapped[typedKey])) {
                    actualChangesMade = true; break;
                 }
            }
        }
        if (!actualChangesMade && Object.keys(submissionPayload).length <= (submissionPayload.vesselId ? 2:1) ) {
             setSubmitError("No changes were made to the editable fields."); setIsSubmitting(false); return;
        }
        await apiClient.patch(`/reports/${initialReportData.id}/resubmit`, submissionPayload);
        setSubmitSuccess("Modified report submitted successfully!");
        setTimeout(() => navigate('/captain/history'), 1500);
      } else if (vesselInfo) {
        const submissionPayload = genericPrepareSubmissionPayload(
            { ...formData, reportType: 'departure', vesselId: vesselInfo.id }, 
            numericFieldsList,
            convertEngineUnitsToNumbers,
            convertAuxEnginesToNumbers
        );
         if (!showInitialRob) {
            delete submissionPayload.initialRobLsifo; delete submissionPayload.initialRobLsmgo;
            delete submissionPayload.initialRobCylOil; delete submissionPayload.initialRobMeOil;
            delete submissionPayload.initialRobAeOil;
        }
        await apiClient.post('/reports', submissionPayload);
        setSubmitSuccess("Departure report submitted successfully!");
        setTimeout(() => navigate('/captain'), 1500);
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isSectionEditable = (sectionChecklistPrefixOrId: string): boolean => {
    if (!isModifyMode) return true;
    if (activeModificationChecklist.length === 0) return false;
    return departureChecklistItems.some(item =>
      activeModificationChecklist.includes(item.id) && 
      (item.id === sectionChecklistPrefixOrId || item.id.startsWith(sectionChecklistPrefixOrId))
    );
  };

  if (isLoadingVessel || (isModifyMode && isLoadingReportToModify)) return <div className="p-4 text-center">Loading data...</div>;
  if (!isModifyMode && vesselError) return <div className="p-4 bg-red-100 text-red-700 rounded">{vesselError}</div>;
  if (modificationModeError) return <div className="p-4 bg-red-100 text-red-700 rounded">{modificationModeError}</div>;
  if (isModifyMode && !initialReportData && !isLoadingReportToModify) return <div className="p-4 text-center">Could not load report to modify.</div>;
  if (!isModifyMode && !vesselInfo && !isLoadingVessel) return <div className="p-4 text-center">Could not load assigned vessel data.</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md">
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
        {isModifyMode && initialReportData ? `Modify Departure Report (ID: ${initialReportData.id.substring(0,8)}...)` : 'New Departure Report'}
      </h2>

      {isModifyMode && officeChangesComment && (
        <div className="mb-6 p-4 border rounded bg-yellow-50 border-yellow-300">
          <h3 className="text-lg font-medium text-yellow-700 mb-1">Office Comments for Modification:</h3>
          <p className="text-sm text-yellow-800 whitespace-pre-wrap">{officeChangesComment}</p>
        </div>
      )}

      <VesselInfoDisplay 
        vesselInfo={vesselInfo} 
        initialReportData={initialReportData} 
        user={user} 
        isModifyMode={isModifyMode}
        isLoading={isLoadingVessel || isLoadingReportToModify}
      />
      
      {isModifyMode && activeModificationChecklist.length > 0 && (
        <div className="my-4 p-4 border rounded bg-yellow-50 border-yellow-300">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Office Change Request</h3>
          <p className="font-medium text-yellow-700">Requested changes for:</p>
          <ul className="list-disc list-inside ml-4 text-yellow-900">
            {activeModificationChecklist.map(itemId => {
              const item = departureChecklistItems.find(ci => ci.id === itemId);
              return <li key={itemId}>{item ? item.label : itemId}</li>;
            })}
          </ul>
        </div>
      )}

      {submitError && <div className="p-3 bg-red-100 text-red-700 rounded">{submitError}</div>}
      {submitSuccess && <div className="p-3 bg-green-100 text-green-700 rounded">{submitSuccess}</div>}

      <GeneralInfoSection
        formData={{
            reportDate: formData.reportDate || '',
            reportTime: formData.reportTime || '',
            timeZone: formData.timeZone || '',
        }}
        handleChange={handleChange}
        isFieldEditable={isFieldEditable}
        isModifyMode={isModifyMode}
      />
      
      <VoyageDetailsSection
        formData={{
            departurePort: formData.departurePort || '',
            destinationPort: formData.destinationPort || '',
            voyageDistance: formData.voyageDistance || '',
            etaDate: formData.etaDate || '',
            etaTime: formData.etaTime || '',
        }}
        handleChange={handleChange}
        isFieldEditable={isFieldEditable}
        isModifyMode={isModifyMode}
        // Make read-only if not in modify mode AND vesselInfo.lastDestinationPort was provided
        isDeparturePortReadOnly={!isModifyMode && vesselInfo?.lastDestinationPort !== null && vesselInfo?.lastDestinationPort !== undefined}
      />
      
      <DraftsCargoSection
        formData={{
            fwdDraft: formData.fwdDraft || '',
            aftDraft: formData.aftDraft || '',
            cargoQuantity: formData.cargoQuantity || '',
            cargoType: formData.cargoType || '',
            cargoStatus: formData.cargoStatus || 'Loaded',
        }}
        handleChange={handleChange}
        isFieldEditable={isFieldEditable}
        isModifyMode={isModifyMode}
      />
      
      <FASPSection
        formData={{
            faspDate: formData.faspDate || '',
            faspTime: formData.faspTime || '',
            faspLatDeg: toStringOrEmpty(formData.faspLatDeg),
            faspLatMin: toStringOrEmpty(formData.faspLatMin),
            faspLatDir: formData.faspLatDir || 'N',
            faspLonDeg: toStringOrEmpty(formData.faspLonDeg),
            faspLonMin: toStringOrEmpty(formData.faspLonMin),
            faspLonDir: formData.faspLonDir || 'E',
            faspCourse: toStringOrEmpty(formData.faspCourse),
        }}
        handleChange={handleChange}
        handleCoordinateChange={handleCoordinateChange}
        isFieldEditable={isFieldEditable}
        activeModificationChecklist={activeModificationChecklist}
        isModifyMode={isModifyMode}
      />

       <DistanceSection
        formData={{
            harbourDistance: toStringOrEmpty(formData.harbourDistance), // Ensure string for section
            harbourTime: formData.harbourTime || '',
        }}
        handleChange={handleChange}
        isFieldEditable={isFieldEditable}
        isModifyMode={isModifyMode}
        showHarbourFields={true}
        title="Harbour Manoeuvring"
       />

      <WeatherSection
        formData={{
            windDirection: formData.windDirection || 'N',
            windForce: toStringOrEmpty(formData.windForce),
            seaDirection: formData.seaDirection || 'N',
            seaState: toStringOrEmpty(formData.seaState),
            swellDirection: formData.swellDirection || 'N',
            swellHeight: toStringOrEmpty(formData.swellHeight),
        }}
        handleChange={handleChange}
        isFieldEditable={isFieldEditable}
        isModifyMode={isModifyMode}
      />

      <fieldset className="border p-4 rounded">
            <legend className="text-lg font-medium px-2">Bunkers</legend>
            <BunkerConsumptionSection
              formData={formData}
              handleChange={handleChange}
              isReadOnly={!isSectionEditable('departure_bunker_')} 
            />
            <BunkerSupplySection
              formData={formData}
              handleChange={handleChange}
              title="Supply (Since Last)"
              isReadOnly={!isFieldEditable('supplyLsifo')} 
            />
      </fieldset>

      {showInitialRob && (
        <fieldset className="border p-4 rounded border-orange-300 bg-orange-50">
            <legend className="text-lg font-medium px-2 text-orange-700">Initial ROB (First Departure Only)</legend>
            <p className="text-sm text-orange-600 mb-2">Enter the initial Remaining On Board quantities as this is the first departure report for this vessel.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label htmlFor="initialRobLsifo" className="block text-sm font-medium text-gray-700">Initial LSIFO (MT)</label>
                    <input type="number" step="0.01" id="initialRobLsifo" name="initialRobLsifo" value={formData.initialRobLsifo ?? ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !isFieldEditable('initialRobLsifo')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('initialRobLsifo') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
                </div>
                 <div>
                    <label htmlFor="initialRobLsmgo" className="block text-sm font-medium text-gray-700">Initial LSMGO (MT)</label>
                    <input type="number" step="0.01" id="initialRobLsmgo" name="initialRobLsmgo" value={formData.initialRobLsmgo ?? ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !isFieldEditable('initialRobLsmgo')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('initialRobLsmgo') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
                </div>
                 <div>
                    <label htmlFor="initialRobCylOil" className="block text-sm font-medium text-gray-700">Initial Cyl Oil (L)</label>
                    <input type="number" step="0.01" id="initialRobCylOil" name="initialRobCylOil" value={formData.initialRobCylOil ?? ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !isFieldEditable('initialRobCylOil')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('initialRobCylOil') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
                </div>
                 <div>
                    <label htmlFor="initialRobMeOil" className="block text-sm font-medium text-gray-700">Initial ME Oil (L)</label>
                    <input type="number" step="0.01" id="initialRobMeOil" name="initialRobMeOil" value={formData.initialRobMeOil ?? ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !isFieldEditable('initialRobMeOil')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('initialRobMeOil') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
                </div>
                 <div>
                    <label htmlFor="initialRobAeOil" className="block text-sm font-medium text-gray-700">Initial AE Oil (L)</label>
                    <input type="number" step="0.01" id="initialRobAeOil" name="initialRobAeOil" value={formData.initialRobAeOil ?? ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !isFieldEditable('initialRobAeOil')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('initialRobAeOil') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
                </div>
            </div>
        </fieldset>
      )}
      <fieldset className="border p-4 rounded">
        <legend className="text-lg font-medium px-2">Machinery</legend>
        <MachineryMEParamsSection
          formData={formData}
          handleChange={handleChange}
          isTcRpm2Optional={true} 
          includeDailyRunHours={true} 
          isReadOnly={!isSectionEditable('departure_machinery_me_')}
        />
        <EngineUnitsSection
          engineUnits={formData.engineUnits || []}
          handleEngineUnitChange={handleEngineUnitChange}
          isReadOnly={!isFieldEditable('engineUnits')} 
        />
        <AuxEnginesSection
          auxEngines={formData.auxEngines || []}
          handleAuxEngineChange={handleAuxEngineChange}
          isReadOnly={!isFieldEditable('auxEngines')} 
        />
      </fieldset>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting || isLoadingVessel || (isModifyMode && isLoadingReportToModify)}
          className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
            (isSubmitting || isLoadingVessel || (isModifyMode && isLoadingReportToModify)) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Submitting...' : (isModifyMode ? 'Submit Modified Report' : 'Submit Departure Report')}
        </button>
      </div>
    </form>
  );
};

export default DepartureForm;
