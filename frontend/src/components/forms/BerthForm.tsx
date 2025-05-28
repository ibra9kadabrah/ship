import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
import { BerthFormData, CardinalDirection, CurrentVoyageDetails, AuxEngineData, FullReportViewDTO, ReportType } from '../../types/report';
import { useNavigate, useParams } from 'react-router-dom';
import { berthChecklistItems } from '../../config/reportChecklists';

// Existing Section Imports
import BunkerSupplySection from './sections/BunkerSupplySection';
import AuxEnginesSection from './sections/AuxEnginesSection';

// New Common Section Imports
import GeneralInfoSection from './sections/common/GeneralInfoSection';
import WeatherSection from './sections/common/WeatherSection';
import VesselInfoDisplay from './sections/common/VesselInfoDisplay';

// New Specialized Section Imports
import BerthDetailsSection from './sections/specialized/BerthDetailsSection';
import CargoOperationsSection from './sections/specialized/CargoOperationsSection';

// Utility Imports
import {
  validateNumericFields,
  validateRequiredFields,
  validateAuxEngines,
  validateTimeFormat,
  ValidationError,
} from '../../utils/formValidation';
import {
  mapReportToFormData as genericMapReportToFormData,
  prepareSubmissionPayload as genericPrepareSubmissionPayload,
  toStringOrEmpty,
  convertAuxEnginesToNumbers,
} from '../../utils/dataTransformation';
import {
  useModificationMode,
  createFieldEditabilityChecker,
  prepareModificationPayload,
} from '../../utils/modificationMode';

const initialAuxEngines = (): AuxEngineData[] => ['DG1', 'DG2', 'V1'].map(name => ({
  engineName: name, load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: ''
}));

const initialBerthFormData: BerthFormData = {
  reportType: 'berth',
  vesselId: '', reportDate: '', reportTime: '', timeZone: '',
  berthDate: '', berthTime: '', berthLatDeg: '', berthLatMin: '', berthLatDir: 'N',
  berthLonDeg: '', berthLonMin: '', berthLonDir: 'E', berthNumber: '',
  cargoOpsStartDate: '', cargoOpsStartTime: '', cargoOpsEndDate: '', cargoOpsEndTime: '',
  cargoLoaded: '', cargoUnloaded: '',
  windDirection: 'N', seaDirection: 'N', swellDirection: 'N',
  windForce: '', seaState: '', swellHeight: '',
  boilerConsumptionLsifo: '', boilerConsumptionLsmgo: '', auxConsumptionLsifo: '', auxConsumptionLsmgo: '',
  supplyLsifo: '', supplyLsmgo: '', supplyCylOil: '', supplyMeOil: '', supplyAeOil: '',
  auxEngines: initialAuxEngines(),
  // ME related fields are not part of BerthFormData by default
};

interface BerthFormProps {
  reportIdToModify?: string;
}

const BerthForm: React.FC<BerthFormProps> = ({ reportIdToModify: reportIdFromProps }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const reportIdForHook = reportIdFromProps || params.reportId;

  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [voyageDetails, setVoyageDetails] = useState<CurrentVoyageDetails | null>(null);
  const [isLoadingVesselAndVoyage, setIsLoadingVesselAndVoyage] = useState(!reportIdForHook);

  const {
    isModifyMode,
    initialReportData,
    activeModificationChecklist,
    officeChangesComment,
    isLoadingReportToModify,
    error: modificationModeError,
  } = useModificationMode(reportIdForHook);
  
  const isFieldEditable = createFieldEditabilityChecker(isModifyMode, activeModificationChecklist, berthChecklistItems);

  const [formData, setFormData] = useState<BerthFormData>(initialBerthFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccessState] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);


  useEffect(() => {
    if (!isModifyMode) {
      setIsLoadingVesselAndVoyage(true); setFetchError(null);
      Promise.all([
        apiClient.get<VesselInfo>('/vessels/my-vessel'),
        apiClient.get<CurrentVoyageDetails>('/voyages/current/details')
      ]).then(([vesselResponse, voyageResponse]) => {
        setVesselInfo(vesselResponse.data);
        setVoyageDetails(voyageResponse.data);
        setFormData(prev => ({ ...prev, vesselId: vesselResponse.data.id }));
      }).catch(err => {
        if (err.response && err.response.status === 404 && err.config.url.includes('/voyages/current/details')) {
            setFetchError('No active voyage found. Cannot submit Berth Report.');
        } else if (err.config.url.includes('/vessels/my-vessel')) {
            setFetchError('Failed to fetch vessel information.');
        } else {
            setFetchError('Failed to fetch initial data.');
        }
      }).finally(() => setIsLoadingVesselAndVoyage(false));
    }
  }, [isModifyMode]);

  useEffect(() => {
    if (isModifyMode && initialReportData) {
      const mappedData = genericMapReportToFormData(initialReportData, 'berth') as BerthFormData;
      setFormData({
        ...initialBerthFormData,
        ...mappedData,
        auxEngines: mappedData.auxEngines || initialAuxEngines(),
      });
      // If modifying, voyage context should ideally come from the report or be re-fetched if necessary
      if (initialReportData.voyageId && (!voyageDetails || voyageDetails.voyageId !== initialReportData.voyageId)) {
        apiClient.get<CurrentVoyageDetails>(`/voyages/${initialReportData.voyageId}/details`)
            .then(res => setVoyageDetails(res.data))
            .catch(() => setFetchError("Could not fetch voyage details for the report being modified."));
      }
    } else if (!isModifyMode) {
        setFormData(initialBerthFormData);
    }
  }, [isModifyMode, initialReportData, voyageDetails]); // Added voyageDetails

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const directionFields = ['berthLatDir', 'berthLonDir', 'windDirection', 'seaDirection', 'swellDirection'];
    if (directionFields.includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value as any }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCoordinateChange = (prefix: 'berthLat' | 'berthLon', part: 'Deg' | 'Min' | 'Dir', value: string) => {
    const name = `${prefix}${part}`;
    if (part === 'Dir') {
      setFormData(prev => ({ ...prev, [name]: value as 'N' | 'S' | 'E' | 'W' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
    if (!isModifyMode && (!vesselInfo || !voyageDetails)) { setSubmitError("Vessel or voyage information not loaded."); return; }
    if (isModifyMode && !initialReportData) { setSubmitError("Original report data not loaded."); return; }
    setIsSubmitting(true); setSubmitError(null); setSubmitSuccessState(null);

    let allValidationErrors: ValidationError[] = [];
    const requiredFieldsList: (keyof BerthFormData)[] = [
        'reportDate', 'reportTime', 'timeZone', 'berthDate', 'berthTime', 'berthNumber',
        'berthLatDeg', 'berthLatMin', 'berthLatDir', 'berthLonDeg', 'berthLonMin', 'berthLonDir',
        'cargoOpsStartDate', 'cargoOpsStartTime', 'cargoOpsEndDate', 'cargoOpsEndTime',
        'windForce', 'seaState', 'swellHeight',
        // Consumption and supply fields are generally required by base types
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
    ];
    allValidationErrors.push(...validateRequiredFields(formData, requiredFieldsList as string[]));

    const numericFieldsList: string[] = [
        'berthLatDeg', 'berthLatMin', 'berthLonDeg', 'berthLonMin',
        'cargoLoaded', 'cargoUnloaded', 'windForce', 'seaState', 'swellHeight',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
    ];
    // cargoLoaded and cargoUnloaded are optional if empty, but numeric if provided
    const optionalNumeric = ['cargoLoaded', 'cargoUnloaded']; 
    allValidationErrors.push(...validateNumericFields(formData, numericFieldsList, optionalNumeric));
    allValidationErrors.push(...validateAuxEngines(formData.auxEngines));

    if (allValidationErrors.length > 0) {
      setSubmitError(allValidationErrors.map(err => `${err.field}: ${err.message}`).join(' \n '));
      setIsSubmitting(false); return;
    }

    try {
      if (isModifyMode && reportIdForHook && initialReportData) {
        const submissionPayload = prepareModificationPayload<BerthFormData>(
          { ...formData, reportType: 'berth', vesselId: initialReportData.vesselId },
          initialReportData, activeModificationChecklist, berthChecklistItems,
          numericFieldsList as (keyof BerthFormData)[],
          undefined, // No engineUnits transformer
          convertAuxEnginesToNumbers
        );
        if (Object.keys(submissionPayload).length <= 2 && !activeModificationChecklist.includes('berth_machinery_aux_engines')) {
             setSubmitError("No changes were made to the editable fields."); setIsSubmitting(false); return;
        }
        await apiClient.patch(`/reports/${initialReportData.id}/resubmit`, submissionPayload);
        setSubmitSuccessState('Berth report resubmitted successfully!');
        setTimeout(() => navigate('/captain/history'), 1500);
      } else if (vesselInfo && voyageDetails) { // Ensure voyageDetails is present for new report
        const submissionPayload = genericPrepareSubmissionPayload(
            { ...formData, reportType: 'berth', vesselId: vesselInfo.id, voyageId: voyageDetails.voyageId }, 
            numericFieldsList,
            undefined, // No engineUnits transformer
            convertAuxEnginesToNumbers
        );
        await apiClient.post('/reports', submissionPayload);
        setSubmitSuccessState('Berth report submitted successfully!');
        setTimeout(() => navigate('/captain'), 1500);
      } else {
        setSubmitError("Missing vessel or voyage information for new report.");
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if ((!isModifyMode && isLoadingVesselAndVoyage) || (isModifyMode && isLoadingReportToModify)) {
    return <div className="p-4 text-center">Loading data...</div>;
  }
  if (fetchError && !isModifyMode) return <div className="p-4 bg-red-100 text-red-700 rounded">{fetchError}</div>;
  if (modificationModeError) return <div className="p-4 bg-red-100 text-red-700 rounded">{modificationModeError}</div>;
  if (isModifyMode && !initialReportData && !isLoadingReportToModify) return <div className="p-4 text-center">Could not load report to modify.</div>;
  if (!isModifyMode && (!vesselInfo || !voyageDetails) && !isLoadingVesselAndVoyage) return <div className="p-4 text-center">Could not load initial vessel or voyage data.</div>;


  return (
    <> 
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
        {isModifyMode && initialReportData ? `Modify Berth Report (ID: ${initialReportData.id.substring(0,8)}...)` : 'New Berth Report'}
      </h2>
      
      <VesselInfoDisplay
        vesselInfo={vesselInfo}
        initialReportData={initialReportData}
        user={user}
        isModifyMode={isModifyMode}
        isLoading={isLoadingVesselAndVoyage || isLoadingReportToModify}
      />
       {voyageDetails && !isModifyMode && ( // Display voyage details for new reports
         <div className="my-4 p-4 border rounded bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-lg mb-2 text-blue-800">Active Voyage Context</h3>
            <p><strong>Voyage ID:</strong> {voyageDetails.voyageId}</p>
            <p><strong>Departure:</strong> {voyageDetails.departurePort}</p>
            <p><strong>Destination:</strong> {voyageDetails.destinationPort}</p>
         </div>
       )}


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
                const item = berthChecklistItems.find(ci => ci.id === itemId);
                return <li key={itemId}>{item ? item.label : itemId}</li>;
                })}
            </ul>
        </div>
      )}

      {submitError && <div className="p-3 bg-red-100 text-red-700 rounded">{submitError}</div>}
      {submitSuccess && <div className="p-3 bg-green-100 text-green-700 rounded">{submitSuccess}</div>}

      {((!isModifyMode && vesselInfo && voyageDetails) || (isModifyMode && initialReportData)) && (
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
            
            <BerthDetailsSection
                formData={{
                    berthDate: formData.berthDate || '',
                    berthTime: formData.berthTime || '',
                    berthLatDeg: toStringOrEmpty(formData.berthLatDeg),
                    berthLatMin: toStringOrEmpty(formData.berthLatMin),
                    berthLatDir: formData.berthLatDir || 'N',
                    berthLonDeg: toStringOrEmpty(formData.berthLonDeg),
                    berthLonMin: toStringOrEmpty(formData.berthLonMin),
                    berthLonDir: formData.berthLonDir || 'E',
                    berthNumber: formData.berthNumber || '',
                }}
                handleChange={handleChange}
                handleCoordinateChange={handleCoordinateChange}
                isFieldEditable={isFieldEditable}
                isModifyMode={isModifyMode}
            />

            <CargoOperationsSection
                formData={{
                    cargoOpsStartDate: formData.cargoOpsStartDate || '',
                    cargoOpsStartTime: formData.cargoOpsStartTime || '',
                    cargoOpsEndDate: formData.cargoOpsEndDate || '',
                    cargoOpsEndTime: formData.cargoOpsEndTime || '',
                    cargoLoaded: toStringOrEmpty(formData.cargoLoaded),
                    cargoUnloaded: toStringOrEmpty(formData.cargoUnloaded),
                }}
                handleChange={handleChange}
                isFieldEditable={isFieldEditable}
                isModifyMode={isModifyMode}
                initialCargoStatus={voyageDetails?.initialCargoStatus || initialReportData?.cargoStatus || null}
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
                {/* Berth form typically only has Supply, and specific Aux/Boiler consumption */}
                 <BunkerSupplySection
                    formData={formData}
                    handleChange={handleChange}
                    title="Bunker Supply (At Berth)"
                    isReadOnly={!isFieldEditable('supplyLsifo')} // Example, adjust based on checklist
                />
                {/* Consider a minimal consumption section if needed for Boiler/Aux */}
                 <div className="mt-4">
                    <h4 className="text-md font-medium text-gray-700 mb-2">Consumption (At Berth)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="boilerConsumptionLsifo" className="block text-sm">Boiler LSIFO</label><input type="number" name="boilerConsumptionLsifo" value={formData.boilerConsumptionLsifo ?? ''} onChange={handleChange} className="mt-1 block w-full p-2 border" readOnly={isModifyMode && !isFieldEditable('boilerConsumptionLsifo')} /></div>
                        <div><label htmlFor="boilerConsumptionLsmgo" className="block text-sm">Boiler LSMGO</label><input type="number" name="boilerConsumptionLsmgo" value={formData.boilerConsumptionLsmgo ?? ''} onChange={handleChange} className="mt-1 block w-full p-2 border" readOnly={isModifyMode && !isFieldEditable('boilerConsumptionLsmgo')} /></div>
                        <div><label htmlFor="auxConsumptionLsifo" className="block text-sm">Aux LSIFO</label><input type="number" name="auxConsumptionLsifo" value={formData.auxConsumptionLsifo ?? ''} onChange={handleChange} className="mt-1 block w-full p-2 border" readOnly={isModifyMode && !isFieldEditable('auxConsumptionLsifo')} /></div>
                        <div><label htmlFor="auxConsumptionLsmgo" className="block text-sm">Aux LSMGO</label><input type="number" name="auxConsumptionLsmgo" value={formData.auxConsumptionLsmgo ?? ''} onChange={handleChange} className="mt-1 block w-full p-2 border" readOnly={isModifyMode && !isFieldEditable('auxConsumptionLsmgo')} /></div>
                    </div>
                </div>
            </fieldset>

            <fieldset className="border p-4 rounded">
            <legend className="text-lg font-medium px-2">Auxiliary Engines</legend>
            <AuxEnginesSection
                auxEngines={formData.auxEngines || []}
                handleAuxEngineChange={handleAuxEngineChange}
                isReadOnly={!isFieldEditable('auxEngines')}
            />
            </fieldset>

            <div className="pt-4">
            <button
                type="submit"
                disabled={isSubmitting || isLoadingVesselAndVoyage || (isModifyMode && isLoadingReportToModify)}
                className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
                (isSubmitting || isLoadingVesselAndVoyage || (isModifyMode && isLoadingReportToModify)) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
            >
                {isSubmitting ? 'Submitting...' : (isModifyMode ? 'Resubmit Berth Report' : 'Submit Berth Report')}
            </button>
            </div>
        </form>
      )}
    </> 
  );
};

export default BerthForm;
