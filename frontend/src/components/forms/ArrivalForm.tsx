import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
import { ArrivalFormData, CardinalDirection, EngineUnitData, AuxEngineData, FullReportViewDTO, ReportType } from '../../types/report';
import { useNavigate, useParams } from 'react-router-dom';
import { arrivalChecklistItems } from '../../config/reportChecklists';

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
import EOSPSection from './sections/specialized/EOSPSection';
import EstimatedBerthingSection from './sections/specialized/EstimatedBerthingSection';

// Utility Imports
import {
  validateNumericFields,
  validateRequiredFields,
  validateEngineUnits,
  validateAuxEngines,
  validateTimeFormat,
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

const initialArrivalFormData: ArrivalFormData = {
  reportType: 'arrival',
  vesselId: '', reportDate: '', reportTime: '', timeZone: '',
  eospDate: '', eospTime: '', eospLatDeg: '', eospLatMin: '', eospLatDir: 'N',
  eospLonDeg: '', eospLonMin: '', eospLonDir: 'E', eospCourse: '',
  distanceSinceLastReport: '', harbourDistance: '', harbourTime: '',
  estimatedBerthingDate: '', estimatedBerthingTime: '',
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

interface ArrivalFormProps {
  reportIdToModify?: string;
}

const ArrivalForm: React.FC<ArrivalFormProps> = ({ reportIdToModify: reportIdFromProps }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const reportIdForHook = reportIdFromProps || params.reportId;

  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [isLoadingVessel, setIsLoadingVessel] = useState(!reportIdForHook);


  const {
    isModifyMode,
    initialReportData,
    activeModificationChecklist,
    officeChangesComment,
    isLoadingReportToModify,
    error: modificationModeError,
  } = useModificationMode(reportIdForHook);
  
  const isFieldEditable = createFieldEditabilityChecker(isModifyMode, activeModificationChecklist, arrivalChecklistItems);

  const [formData, setFormData] = useState<ArrivalFormData>(initialArrivalFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccessState] = useState<string | null>(null);
  const [vesselError, setVesselError] = useState<string | null>(null);


  useEffect(() => {
    if (!isModifyMode) { // Only fetch for new reports, modification data is handled by hook
        setIsLoadingVessel(true); setVesselError(null);
        apiClient.get<VesselInfo>('/vessels/my-vessel')
            .then(response => {
                setVesselInfo(response.data);
                setFormData(prev => ({ ...prev, vesselId: response.data.id }));
            })
            .catch(err => setVesselError('Failed to fetch vessel information.'))
            .finally(() => setIsLoadingVessel(false));
    }
  }, [isModifyMode]);

  useEffect(() => {
    if (isModifyMode && initialReportData) {
      const mappedData = genericMapReportToFormData(initialReportData, 'arrival') as ArrivalFormData;
      setFormData({
        ...initialArrivalFormData,
        ...mappedData,
        engineUnits: mappedData.engineUnits || initialEngineUnits(),
        auxEngines: mappedData.auxEngines || initialAuxEngines(),
      });
    } else if (!isModifyMode) {
        setFormData(initialArrivalFormData);
    }
  }, [isModifyMode, initialReportData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const directionFields = ['eospLatDir', 'eospLonDir', 'windDirection', 'seaDirection', 'swellDirection'];
    if (directionFields.includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value as any }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCoordinateChange = (prefix: 'eospLat' | 'eospLon', part: 'Deg' | 'Min' | 'Dir', value: string) => {
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
      if (updatedUnits[index]) { updatedUnits[index] = { ...updatedUnits[index], [field]: value }; }
      return { ...prev, engineUnits: updatedUnits };
    });
  };

  const handleAuxEngineChange = (index: number, field: keyof Omit<AuxEngineData, 'engineName'>, value: string) => {
    setFormData(prev => {
      const updatedAux = prev.auxEngines ? [...prev.auxEngines] : initialAuxEngines();
      if (updatedAux[index]) { updatedAux[index] = { ...updatedAux[index], [field]: value }; }
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
    if (!isModifyMode && !vesselInfo) { setSubmitError("Vessel information not loaded."); return; }
    if (isModifyMode && !initialReportData) { setSubmitError("Original report data not loaded."); return; }
    setIsSubmitting(true); setSubmitError(null); setSubmitSuccessState(null);

    let allValidationErrors: ValidationError[] = [];
    const requiredFieldsList: (keyof ArrivalFormData)[] = [
        'reportDate', 'reportTime', 'timeZone', 'eospDate', 'eospTime', 'eospLatDeg', 'eospLatMin', 'eospLatDir',
        'eospLonDeg', 'eospLonMin', 'eospLonDir', 'eospCourse', 'distanceSinceLastReport', 'harbourDistance', 
        'harbourTime', 'estimatedBerthingDate', 'estimatedBerthingTime', 'mePresentRpm', 'meCurrentSpeed',
        'windForce', 'seaState', 'swellHeight',
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 
        'auxConsumptionLsifo', 'auxConsumptionLsmgo', 'supplyLsifo', 'supplyLsmgo', 
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp',
        'meTcRpm1', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours',
    ];
    allValidationErrors.push(...validateRequiredFields(formData, requiredFieldsList as string[]));

    const numericFieldsList: string[] = [
        'eospLatDeg', 'eospLatMin', 'eospLonDeg', 'eospLonMin', 'eospCourse', 'distanceSinceLastReport', 'harbourDistance',
        'windForce', 'seaState', 'swellHeight', 'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 
        'meConsumptionMeOil', 'meConsumptionAeOil', 'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 
        'auxConsumptionLsifo', 'auxConsumptionLsmgo', 'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 
        'supplyMeOil', 'supplyAeOil', 'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 
        'meScavengeAirTemp', 'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 
        'meThrustBearingTemp', 'meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed'
    ];
    const optionalNumeric = ['meTcRpm2'];
    allValidationErrors.push(...validateNumericFields(formData, numericFieldsList, optionalNumeric));
    allValidationErrors.push(...validateTimeFormat(formData.harbourTime, 'harbourTime'));
    allValidationErrors.push(...validateEngineUnits(formData.engineUnits));
    allValidationErrors.push(...validateAuxEngines(formData.auxEngines));

    if (allValidationErrors.length > 0) {
      setSubmitError(allValidationErrors.map(err => `${err.field}: ${err.message}`).join(' \n '));
      setIsSubmitting(false); return;
    }

    try {
      if (isModifyMode && reportIdForHook && initialReportData) {
        const submissionPayload = prepareModificationPayload<ArrivalFormData>(
          { ...formData, reportType: 'arrival', vesselId: initialReportData.vesselId },
          initialReportData, activeModificationChecklist, arrivalChecklistItems,
          numericFieldsList as (keyof ArrivalFormData)[],
          convertEngineUnitsToNumbers, convertAuxEnginesToNumbers
        );
        // Simplified change detection
        if (Object.keys(submissionPayload).length <= 2) { // Only reportType and vesselId
             setSubmitError("No changes were made to the editable fields."); setIsSubmitting(false); return;
        }
        await apiClient.patch(`/reports/${initialReportData.id}/resubmit`, submissionPayload);
        setSubmitSuccessState('Report resubmitted successfully!');
        setTimeout(() => navigate('/captain/history'), 1500);
      } else if (vesselInfo) {
        const submissionPayload = genericPrepareSubmissionPayload(
            { ...formData, reportType: 'arrival', vesselId: vesselInfo.id }, 
            numericFieldsList,
            convertEngineUnitsToNumbers,
            convertAuxEnginesToNumbers
        );
        await apiClient.post('/reports', submissionPayload);
        setSubmitSuccessState('Arrival report submitted successfully!');
        setTimeout(() => navigate('/captain'), 1500);
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if ((!isModifyMode && isLoadingVessel) || (isModifyMode && isLoadingReportToModify)) {
    return <div className="p-4 text-center">Loading data...</div>;
  }
  if (vesselError && !isModifyMode) return <div className="p-4 bg-red-100 text-red-700 rounded">{vesselError}</div>;
  if (modificationModeError) return <div className="p-4 bg-red-100 text-red-700 rounded">{modificationModeError}</div>;
  if (isModifyMode && !initialReportData && !isLoadingReportToModify) return <div className="p-4 text-center">Could not load report to modify.</div>;
  if (!isModifyMode && !vesselInfo && !isLoadingVessel) return <div className="p-4 text-center">Could not load assigned vessel data.</div>;

  return (
    <> 
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
        {isModifyMode && initialReportData ? `Modify Arrival Report (ID: ${initialReportData.id.substring(0,8)}...)` : 'New Arrival Report'}
      </h2>
      
      <VesselInfoDisplay
        vesselInfo={vesselInfo}
        initialReportData={initialReportData}
        user={user}
        isModifyMode={isModifyMode}
        isLoading={isLoadingVessel || isLoadingReportToModify}
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
                const item = arrivalChecklistItems.find(ci => ci.id === itemId);
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
        
        <EOSPSection
            formData={{
                eospDate: formData.eospDate || '',
                eospTime: formData.eospTime || '',
                eospLatDeg: toStringOrEmpty(formData.eospLatDeg),
                eospLatMin: toStringOrEmpty(formData.eospLatMin),
                eospLatDir: formData.eospLatDir || 'N',
                eospLonDeg: toStringOrEmpty(formData.eospLonDeg),
                eospLonMin: toStringOrEmpty(formData.eospLonMin),
                eospLonDir: formData.eospLonDir || 'E',
                eospCourse: toStringOrEmpty(formData.eospCourse),
            }}
            handleChange={handleChange}
            handleCoordinateChange={handleCoordinateChange}
            isFieldEditable={isFieldEditable}
            isModifyMode={isModifyMode}
        />

        <DistanceSection
            formData={{
                distanceSinceLastReport: toStringOrEmpty(formData.distanceSinceLastReport),
                harbourDistance: toStringOrEmpty(formData.harbourDistance),
                harbourTime: formData.harbourTime || '',
            }}
            handleChange={handleChange}
            isFieldEditable={isFieldEditable}
            isModifyMode={isModifyMode}
            showHarbourFields={true}
            title="Distance Information"
        />

        <EstimatedBerthingSection
            formData={{
                estimatedBerthingDate: formData.estimatedBerthingDate || '',
                estimatedBerthingTime: formData.estimatedBerthingTime || '',
            }}
            handleChange={handleChange}
            isFieldEditable={isFieldEditable}
            isModifyMode={isModifyMode}
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
              isReadOnly={!isSectionEditableByChecklistId('arrival_bunker_')} // Use prefix
            />
            <BunkerSupplySection
              formData={formData}
              handleChange={handleChange}
              title="Supply (Since Last)"
              isReadOnly={!isFieldEditable('supplyLsifo')} // Check one field or use section ID
            />
        </fieldset>

        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Machinery</legend>
          <MachineryMEParamsSection
            formData={formData}
            handleChange={handleChange}
            isTcRpm2Optional={true} 
            includeDailyRunHours={true} 
            isReadOnly={!isSectionEditableByChecklistId('arrival_machinery_me_')} // Use prefix
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
            {isSubmitting ? 'Submitting...' : (isModifyMode ? 'Resubmit Arrival Report' : 'Submit Arrival Report')}
          </button>
        </div>
      </form>
    </>
  );
};

export default ArrivalForm;