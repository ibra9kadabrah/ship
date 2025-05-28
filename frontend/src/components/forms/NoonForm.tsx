import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import apiClient, { getReportById } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
import { NoonFormData, PassageState, CardinalDirection, EngineUnitData, AuxEngineData, FullReportViewDTO, ReportType } from '../../types/report';
import { useNavigate } from 'react-router-dom';
import { getChecklistForReportType, ChecklistItem } from '../../config/reportChecklists';

// Existing Section Imports
import BunkerConsumptionSection from './sections/BunkerConsumptionSection';
import BunkerSupplySection from './sections/BunkerSupplySection';
import MachineryMEParamsSection from './sections/MachineryMEParamsSection';
import EngineUnitsSection from './sections/EngineUnitsSection';
import AuxEnginesSection from './sections/AuxEnginesSection';
// CoordinateInputGroup is used by NoonPositionSection and PassageStateSection

// New Common Section Imports
import GeneralInfoSection from './sections/common/GeneralInfoSection';
import WeatherSection from './sections/common/WeatherSection';
import VesselInfoDisplay from './sections/common/VesselInfoDisplay';
import DistanceSection from './sections/common/DistanceSection';

// New Specialized Section Imports
import NoonPositionSection from './sections/specialized/NoonPositionSection';
import PassageStateSection from './sections/specialized/PassageStateSection';

// Utility Imports
import {
  validateNumericFields,
  validateRequiredFields,
  validateEngineUnits,
  validateAuxEngines,
  ValidationError,
} from '../../utils/formValidation';
import {
  mapReportToFormData as genericMapReportToFormData,
  prepareSubmissionPayload as genericPrepareSubmissionPayload,
  toStringOrEmpty,
  convertEngineUnitsToNumbers,
  convertAuxEnginesToNumbers,
} from '../../utils/dataTransformation';
import {
  useModificationMode,
  createFieldEditabilityChecker,
  prepareModificationPayload,
} from '../../utils/modificationMode';

const initialEngineUnits = (): EngineUnitData[] => Array.from({ length: 8 }, (_, i) => ({
  unitNumber: i + 1, exhaustTemp: '', underPistonAir: '', pcoOutletTemp: '', jcfwOutletTemp: ''
}));
const initialAuxEngines = (): AuxEngineData[] => ['DG1', 'DG2', 'V1'].map(name => ({
  engineName: name, load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: ''
}));

const initialNoonFormData: Partial<NoonFormData> = {
  reportType: 'noon',
  reportDate: '', reportTime: '', timeZone: '',
  passageState: null, distanceSinceLastReport: '',
  noonDate: '', noonTime: '', noonLatDeg: '', noonLatMin: '', noonLatDir: 'N',
  noonLonDeg: '', noonLonMin: '', noonLonDir: 'E', noonCourse: '',
  sospDate: '', sospTime: '', sospLatDeg: '', sospLatMin: '', sospLatDir: 'N',
  sospLonDeg: '', sospLonMin: '', sospLonDir: 'E', sospCourse: '',
  rospDate: '', rospTime: '', rospLatDeg: '', rospLatMin: '', rospLatDir: 'N',
  rospLonDeg: '', rospLonMin: '', rospLonDir: 'E', rospCourse: '',
  windDirection: 'N', seaDirection: 'N', swellDirection: 'N',
  windForce: '', seaState: '', swellHeight: '',
  meConsumptionLsifo: '', meConsumptionLsmgo: '', meConsumptionCylOil: '', meConsumptionMeOil: '', meConsumptionAeOil: '',
  boilerConsumptionLsifo: '', boilerConsumptionLsmgo: '', auxConsumptionLsifo: '', auxConsumptionLsmgo: '',
  supplyLsifo: '', supplyLsmgo: '', supplyCylOil: '', supplyMeOil: '', supplyAeOil: '',
  meFoPressure: '', meLubOilPressure: '', meFwInletTemp: '', meLoInletTemp: '', meScavengeAirTemp: '',
  meTcRpm1: '', meTcRpm2: '', meTcExhaustTempIn: '', meTcExhaustTempOut: '', meThrustBearingTemp: '', meDailyRunHours: '',
  mePresentRpm: '', meCurrentSpeed: '',
  engineUnits: initialEngineUnits(),
  auxEngines: initialAuxEngines(),
};

interface NoonFormProps {
  reportIdToModify?: string;
}

const NoonForm: React.FC<NoonFormProps> = ({ reportIdToModify: reportIdFromProps }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [prevNoonState, setPrevNoonState] = useState<PassageState | null>(null); // For SOSP/ROSP logic

  const {
    isModifyMode,
    initialReportData,
    activeModificationChecklist,
    officeChangesComment,
    isLoadingReportToModify,
    error: modificationModeError,
  } = useModificationMode(reportIdFromProps);

  const noonChecklistItems = getChecklistForReportType('noon');
  const isFieldEditable = createFieldEditabilityChecker(isModifyMode, activeModificationChecklist, noonChecklistItems);
  
  const [formData, setFormData] = useState<Partial<NoonFormData>>(initialNoonFormData);
  const [isLoading, setIsLoading] = useState(false); // General loading for submit and initial vessel fetch
  const [error, setError] = useState<string | null>(null); // For general form errors
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null); // Renamed from 'error' to avoid conflict
  const [submitSuccess, setSubmitSuccessState] = useState<string | null>(null); // Renamed from 'success'

  useEffect(() => {
    const fetchVesselInfo = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await apiClient.get<VesselInfo>('/vessels/my-vessel');
        setVesselInfo(response.data);
        setFormData(prev => ({ ...prev, vesselId: response.data.id }));
        setPrevNoonState(response.data.previousNoonPassageState ?? null);
      } catch (err) {
        setError('Failed to fetch vessel information.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchVesselInfo();
  }, []);

  useEffect(() => {
    if (isModifyMode && initialReportData) {
      const mappedData = genericMapReportToFormData(initialReportData, 'noon') as Partial<NoonFormData>;
      setFormData({
        ...initialNoonFormData,
        ...mappedData,
        engineUnits: mappedData.engineUnits || initialEngineUnits(),
        auxEngines: mappedData.auxEngines || initialAuxEngines(),
      });
      // Fetch previous noon state specifically for the voyage of the report being modified
      if (initialReportData.voyageId) {
        apiClient.get<{ previousNoonPassageState: PassageState | null }>(`/voyages/${initialReportData.voyageId}/state`)
          .then(res => setPrevNoonState(res.data.previousNoonPassageState ?? null))
          .catch(() => setPrevNoonState(vesselInfo?.previousNoonPassageState ?? null)); // Fallback
      } else {
        setPrevNoonState(vesselInfo?.previousNoonPassageState ?? null);
      }
    } else if (!isModifyMode) {
        setFormData(initialNoonFormData);
    }
  }, [isModifyMode, initialReportData, vesselInfo]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const directionFields = ['noonLatDir', 'noonLonDir', 'sospLatDir', 'sospLonDir', 'rospLatDir', 'rospLonDir', 'windDirection', 'seaDirection', 'swellDirection'];
    if (directionFields.includes(name) || name === 'passageState') {
      setFormData(prev => ({ ...prev, [name]: value as any }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCoordinateChange = ( prefix: 'noonLat' | 'noonLon' | 'sospLat' | 'sospLon' | 'rospLat' | 'rospLon', part: 'Deg' | 'Min' | 'Dir', value: string) => {
    const name = `${prefix}${part}`;
    if (part === 'Dir') {
      setFormData(prev => ({ ...prev, [name]: value as 'N' | 'S' | 'E' | 'W' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEngineUnitChange = (index: number, field: keyof Omit<EngineUnitData, 'unitNumber'>, value: string) => {
    setFormData(prev => {
      const updatedUnits = prev.engineUnits ? [...prev.engineUnits] : initialEngineUnits();
      if (updatedUnits[index]) {
        updatedUnits[index] = { ...updatedUnits[index], [field]: value };
      }
      return { ...prev, engineUnits: updatedUnits };
    });
  };

  const handleAuxEngineChange = (index: number, field: keyof Omit<AuxEngineData, 'engineName'>, value: string) => {
    setFormData(prev => {
      const updatedAux = prev.auxEngines ? [...prev.auxEngines] : initialAuxEngines();
      if (updatedAux[index]) {
        updatedAux[index] = { ...updatedAux[index], [field]: value };
      }
      return { ...prev, auxEngines: updatedAux };
    });
  };
  
  const isSectionEditableByChecklistId = (sectionChecklistId: string): boolean => {
    if (!isModifyMode) return true;
    if (activeModificationChecklist.length === 0) return false;
    return activeModificationChecklist.includes(sectionChecklistId);
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); setSubmitError(null); setSubmitSuccessState(null);

    let allValidationErrors: ValidationError[] = [];
    const requiredFields: (keyof NoonFormData)[] = [
        'reportDate', 'reportTime', 'timeZone', 'distanceSinceLastReport',
        'noonDate', 'noonTime', 'noonLatDeg', 'noonLatMin', 'noonLatDir', 
        'noonLonDeg', 'noonLonMin', 'noonLonDir', 'noonCourse', 
        'mePresentRpm', 'meCurrentSpeed', 'windForce', 'seaState', 'swellHeight'
        // Other base fields are implicitly required by type or section components
    ];
    allValidationErrors.push(...validateRequiredFields(formData, requiredFields as string[]));

    const numericFieldsList: string[] = [ 
        'distanceSinceLastReport', 'windForce', 'seaState', 'swellHeight',
        'noonLatDeg', 'noonLatMin', 'noonLonDeg', 'noonLonMin', 'noonCourse', 
        'sospLatDeg', 'sospLatMin', 'sospLonDeg', 'sospLonMin', 'sospCourse', 
        'rospLatDeg', 'rospLatMin', 'rospLonDeg', 'rospLonMin', 'rospCourse', 
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp',
        'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed'
    ];
    const optionalNumeric = ['meTcRpm2', 'sospLatDeg', 'sospLatMin', 'sospLonDeg', 'sospLonMin', 'sospCourse', 'rospLatDeg', 'rospLatMin', 'rospLonDeg', 'rospLonMin', 'rospCourse'];
    allValidationErrors.push(...validateNumericFields(formData, numericFieldsList, optionalNumeric));
    
    if (formData.passageState === 'SOSP') {
        const sospRequired: (keyof NoonFormData)[] = ['sospDate', 'sospTime', 'sospLatDeg', 'sospLatMin', 'sospLatDir', 'sospLonDeg', 'sospLonMin', 'sospLonDir', 'sospCourse'];
        allValidationErrors.push(...validateRequiredFields(formData, sospRequired as string[]));
    }
    if (formData.passageState === 'ROSP') {
        const rospRequired: (keyof NoonFormData)[] = ['rospDate', 'rospTime', 'rospLatDeg', 'rospLatMin', 'rospLatDir', 'rospLonDeg', 'rospLonMin', 'rospLonDir', 'rospCourse'];
        allValidationErrors.push(...validateRequiredFields(formData, rospRequired as string[]));
    }
    if (prevNoonState === 'SOSP' && !formData.passageState && !isModifyMode) { 
        allValidationErrors.push({field: 'passageState', message: 'Passage state (SOSP/ROSP) is required because the previous Noon report was SOSP.'});
    }
    if (prevNoonState !== 'SOSP' && formData.passageState === 'ROSP' && !isModifyMode) { 
        allValidationErrors.push({field: 'passageState', message: 'ROSP state is only allowed immediately following an SOSP state.'});
    }

    allValidationErrors.push(...validateEngineUnits(formData.engineUnits));
    allValidationErrors.push(...validateAuxEngines(formData.auxEngines));

    if (allValidationErrors.length > 0) {
      setSubmitError(allValidationErrors.map(e => `${e.field}: ${e.message}`).join(' \n ')); // Use setSubmitError
      setIsSubmitting(false); return; // Use setIsSubmitting
    }

    try {
      if (isModifyMode && reportIdFromProps && initialReportData) {
        const submissionPayload = prepareModificationPayload<NoonFormData>(
          {...formData, reportType: 'noon', vesselId: initialReportData.vesselId },
          initialReportData, activeModificationChecklist, noonChecklistItems,
          numericFieldsList as (keyof NoonFormData)[],
          convertEngineUnitsToNumbers, convertAuxEnginesToNumbers
        );
        
        if (Object.keys(submissionPayload).length <= 2 && !activeModificationChecklist.includes('noon_machinery_engine_units') && !activeModificationChecklist.includes('noon_machinery_aux_engines')) {
            setSubmitError("No changes were made to the editable fields."); setIsSubmitting(false); return; // Use setSubmitError, setIsSubmitting
        }
        await apiClient.patch(`/reports/${initialReportData.id}/resubmit`, submissionPayload);
        setSubmitSuccessState("Modified Noon report submitted successfully!"); // Use setSubmitSuccessState
        setTimeout(() => navigate('/captain/history'), 1500);
      } else if (vesselInfo) {
        const submissionPayload = genericPrepareSubmissionPayload(
            { ...formData, reportType: 'noon', vesselId: vesselInfo.id },
            numericFieldsList,
            convertEngineUnitsToNumbers,
            convertAuxEnginesToNumbers
        );
        await apiClient.post('/reports', submissionPayload);
        setSubmitSuccessState('Noon report submitted successfully!'); // Use setSubmitSuccessState
        setTimeout(() => navigate('/captain'), 1500);
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit report.'); // Use setSubmitError
    } finally {
      setIsSubmitting(false); // Use setIsSubmitting
    }
  };

  // Display loading states
  if (!isModifyMode && isLoading && !vesselInfo ) return <p className="text-center p-4">Loading initial data...</p>;
  if (isModifyMode && isLoadingReportToModify) return <p className="text-center p-4">Loading report for modification...</p>;
  
  // Display errors from hooks or initial loading
  if (modificationModeError) return <div className="p-4 bg-red-100 text-red-700 rounded">{modificationModeError}</div>;
  if (error && !isSubmitting) return <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>; // General error, not submit error

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
        {isModifyMode && initialReportData ? `Modify Noon Report (ID: ${initialReportData.id.substring(0,8)}...)` : 'New Noon Report'}
      </h2>
      
      <VesselInfoDisplay
        vesselInfo={vesselInfo}
        initialReportData={initialReportData}
        user={user}
        isModifyMode={isModifyMode}
        isLoading={isLoading || isLoadingReportToModify} // Combined loading state for display
      />

      {isModifyMode && officeChangesComment && (
        <div className="my-4 p-4 border rounded bg-yellow-50 border-yellow-300">
          <h3 className="text-lg font-medium text-yellow-700 mb-1">Office Comments:</h3>
          <p className="text-sm text-yellow-800 whitespace-pre-wrap">{officeChangesComment}</p>
        </div>
      )}
      {isModifyMode && activeModificationChecklist.length > 0 && (
         <div className="my-4 p-4 border rounded bg-yellow-50 border-yellow-300">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Requested Changes For:</h3>
            <ul className="list-disc list-inside ml-4 text-yellow-900">
                {activeModificationChecklist.map(itemId => {
                const item = noonChecklistItems.find(ci => ci.id === itemId);
                return <li key={itemId}>{item ? item.label : itemId}</li>;
                })}
            </ul>
        </div>
      )}

      {submitError && <div className="p-3 bg-red-100 text-red-700 rounded">{submitError}</div>}
      {submitSuccess && <div className="p-3 bg-green-100 text-green-700 rounded">{submitSuccess}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md">
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

        <NoonPositionSection
            formData={{
                noonDate: formData.noonDate || '',
                noonTime: formData.noonTime || '',
                noonLatDeg: toStringOrEmpty(formData.noonLatDeg),
                noonLatMin: toStringOrEmpty(formData.noonLatMin),
                noonLatDir: formData.noonLatDir || 'N',
                noonLonDeg: toStringOrEmpty(formData.noonLonDeg),
                noonLonMin: toStringOrEmpty(formData.noonLonMin),
                noonLonDir: formData.noonLonDir || 'E',
                noonCourse: toStringOrEmpty(formData.noonCourse),
            }}
            handleChange={handleChange}
            handleCoordinateChange={handleCoordinateChange}
            isFieldEditable={isFieldEditable}
            isModifyMode={isModifyMode}
        />
        
        <DistanceSection 
            formData={{ distanceSinceLastReport: toStringOrEmpty(formData.distanceSinceLastReport) }}
            handleChange={handleChange}
            isFieldEditable={isFieldEditable}
            isModifyMode={isModifyMode}
            showHarbourFields={false} // Noon form doesn't have harbour fields
            title="Distance Since Last Report"
        />

        <PassageStateSection
            formData={{
                passageState: formData.passageState ?? null,
                sospDate: formData.sospDate || '',
                sospTime: formData.sospTime || '',
                sospLatDeg: toStringOrEmpty(formData.sospLatDeg),
                sospLatMin: toStringOrEmpty(formData.sospLatMin),
                sospLatDir: formData.sospLatDir || 'N',
                sospLonDeg: toStringOrEmpty(formData.sospLonDeg),
                sospLonMin: toStringOrEmpty(formData.sospLonMin),
                sospLonDir: formData.sospLonDir || 'E',
                sospCourse: toStringOrEmpty(formData.sospCourse),
                rospDate: formData.rospDate || '',
                rospTime: formData.rospTime || '',
                rospLatDeg: toStringOrEmpty(formData.rospLatDeg),
                rospLatMin: toStringOrEmpty(formData.rospLatMin),
                rospLatDir: formData.rospLatDir || 'N',
                rospLonDeg: toStringOrEmpty(formData.rospLonDeg),
                rospLonMin: toStringOrEmpty(formData.rospLonMin),
                rospLonDir: formData.rospLonDir || 'E',
                rospCourse: toStringOrEmpty(formData.rospCourse),
            }}
            handleChange={handleChange}
            handleCoordinateChange={handleCoordinateChange}
            isFieldEditable={isFieldEditable}
            isModifyMode={isModifyMode}
            prevNoonState={prevNoonState}
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
            isReadOnly={!isSectionEditableByChecklistId('noon_bunker_me_cons') && !isSectionEditableByChecklistId('noon_bunker_boiler_cons') && !isSectionEditableByChecklistId('noon_bunker_aux_cons')}
          />
          <BunkerSupplySection
            formData={formData}
            handleChange={handleChange}
            title="Supply (Since Last)"
            isReadOnly={!isSectionEditableByChecklistId('noon_bunker_supplies')}
          />
        </fieldset>

        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Machinery</legend>
          <MachineryMEParamsSection
            formData={formData}
            handleChange={handleChange}
            isTcRpm2Optional={true}
            includeDailyRunHours={true}
            isReadOnly={!isSectionEditableByChecklistId('noon_machinery_me_press_temp') && !isSectionEditableByChecklistId('noon_machinery_me_tc') && !isSectionEditableByChecklistId('noon_machinery_me_run_perf')}
          />
          <EngineUnitsSection
            engineUnits={formData.engineUnits || []}
            handleEngineUnitChange={handleEngineUnitChange}
            isReadOnly={!isSectionEditableByChecklistId('noon_machinery_engine_units')}
          />
          <AuxEnginesSection
            auxEngines={formData.auxEngines || []}
            handleAuxEngineChange={handleAuxEngineChange}
            isReadOnly={!isSectionEditableByChecklistId('noon_machinery_aux_engines')}
          />
        </fieldset>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading || (isModifyMode && isLoadingReportToModify)}
            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
              (isSubmitting || isLoading || (isModifyMode && isLoadingReportToModify)) ? 'opacity-70 cursor-not-allowed' : '' // Added isSubmitting to disabled
              }`}
          >
            {isSubmitting ? 'Submitting...' : (isModifyMode ? 'Submit Modified Noon Report' : 'Submit Noon Report')}
          </button>
        </div>
      </form>
      {/* Removed extra closing bracket for the conditional rendering based on isLoadingReportToModify */}
    </>
  );
};

export default NoonForm;
