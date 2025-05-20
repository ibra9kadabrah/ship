import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
import { ArrivalAnchorNoonFormData, CardinalDirection, EngineUnitData, AuxEngineData, FullReportViewDTO, ReportEngineUnit, ReportAuxEngine } from '../../types/report'; // Use new FormData type
import { useNavigate } from 'react-router-dom';
import { arrivalAnchorNoonChecklistItems } from '../../config/reportChecklists';
import BunkerConsumptionSection from './sections/BunkerConsumptionSection';
import BunkerSupplySection from './sections/BunkerSupplySection';
import MachineryMEParamsSection from './sections/MachineryMEParamsSection';
import EngineUnitsSection from './sections/EngineUnitsSection';
import AuxEnginesSection from './sections/AuxEnginesSection';
import CoordinateInputGroup from './CoordinateInputGroup';

// Helper function to initialize machinery data
const initializeEngineUnits = (): EngineUnitData[] => {
  return Array.from({ length: 8 }, (_, i) => ({
    unitNumber: i + 1,
    exhaustTemp: '', underPistonAir: '', pcoOutletTemp: '', jcfwOutletTemp: ''
  }));
};

const initializeAuxEngines = (): AuxEngineData[] => {
  const names = ['DG1', 'DG2', 'V1'];
  return names.map(name => ({
    engineName: name,
    load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: ''
  }));
};

interface ArrivalAnchorNoonFormProps {
  reportIdToModify?: string;
  initialData?: FullReportViewDTO; // As per plan, might need adjustment if type is different
}

const ArrivalAnchorNoonForm: React.FC<ArrivalAnchorNoonFormProps> = ({ reportIdToModify, initialData: propInitialData }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [formData, setFormData] = useState<Partial<ArrivalAnchorNoonFormData>>({
    reportType: 'arrival_anchor_noon',
    vesselId: '',
    reportDate: '',
    reportTime: '',
    timeZone: '',
    distanceSinceLastReport: '',
    noonDate: '', 
    noonTime: '', 
    noonLatDeg: '',
    noonLatMin: '',
    noonLatDir: 'N',
    noonLonDeg: '',
    noonLonMin: '',
    noonLonDir: 'E',
    noonCourse: '',
    // Weather
    windDirection: 'N', seaDirection: 'N', swellDirection: 'N',
    windForce: '', seaState: '', swellHeight: '',
    // Bunkers (Consumption)
    meConsumptionLsifo: '', meConsumptionLsmgo: '', meConsumptionCylOil: '', meConsumptionMeOil: '', meConsumptionAeOil: '',
    boilerConsumptionLsifo: '', boilerConsumptionLsmgo: '',
    auxConsumptionLsifo: '', auxConsumptionLsmgo: '',
    // Bunkers (Supply)
    supplyLsifo: '', supplyLsmgo: '', supplyCylOil: '', supplyMeOil: '', supplyAeOil: '',
    // Machinery (ME Params)
    meFoPressure: '', meLubOilPressure: '', meFwInletTemp: '', meLoInletTemp: '', meScavengeAirTemp: '',
    meTcRpm1: '', meTcRpm2: '', meTcExhaustTempIn: '', meTcExhaustTempOut: '', meThrustBearingTemp: '', meDailyRunHours: '',
    mePresentRpm: '',
    meCurrentSpeed: '',
    // Machinery (Units/Aux)
    engineUnits: initializeEngineUnits(),
    auxEngines: initializeAuxEngines(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for modification mode
  const [isModifyMode, setIsModifyMode] = useState<boolean>(!!reportIdToModify);
  const [initialReportData, setInitialReportData] = useState<FullReportViewDTO | null>(propInitialData || null);
  const [activeModificationChecklist, setActiveModificationChecklist] = useState<string[]>([]);
  const [officeChangesComment, setOfficeChangesComment] = useState<string | null>(null);
  const [isLoadingReportToModify, setIsLoadingReportToModify] = useState<boolean>(false);

  // Helper to map FullReportViewDTO to ArrivalAnchorNoonFormData
  const mapReportToFormData = (report: FullReportViewDTO): Partial<ArrivalAnchorNoonFormData> => {
    return {
      reportType: 'arrival_anchor_noon',
      vesselId: report.vesselId,
      reportDate: report.reportDate?.split('T')[0] || '',
      reportTime: report.reportTime || '',
      timeZone: report.timeZone || '',
      
      distanceSinceLastReport: report.distanceSinceLastReport?.toString() || '',
      noonDate: report.noonDate?.split('T')[0] || '',
      noonTime: report.noonTime || '',
      noonLatDeg: report.noonLatDeg?.toString() || '',
      noonLatMin: report.noonLatMin?.toString() || '',
      noonLatDir: report.noonLatDir || 'N',
      noonLonDeg: report.noonLonDeg?.toString() || '',
      noonLonMin: report.noonLonMin?.toString() || '',
      noonLonDir: report.noonLonDir || 'E',
      noonCourse: report.noonCourse?.toString() || '',

      windDirection: report.windDirection || 'N',
      windForce: report.windForce?.toString() || '',
      seaDirection: report.seaDirection || 'N',
      seaState: report.seaState?.toString() || '',
      swellDirection: report.swellDirection || 'N',
      swellHeight: report.swellHeight?.toString() || '',

      meConsumptionLsifo: report.meConsumptionLsifo?.toString() || '',
      meConsumptionLsmgo: report.meConsumptionLsmgo?.toString() || '',
      meConsumptionCylOil: report.meConsumptionCylOil?.toString() || '',
      meConsumptionMeOil: report.meConsumptionMeOil?.toString() || '',
      meConsumptionAeOil: report.meConsumptionAeOil?.toString() || '',
      boilerConsumptionLsifo: report.boilerConsumptionLsifo?.toString() || '',
      boilerConsumptionLsmgo: report.boilerConsumptionLsmgo?.toString() || '',
      auxConsumptionLsifo: report.auxConsumptionLsifo?.toString() || '',
      auxConsumptionLsmgo: report.auxConsumptionLsmgo?.toString() || '',

      supplyLsifo: report.supplyLsifo?.toString() || '',
      supplyLsmgo: report.supplyLsmgo?.toString() || '',
      supplyCylOil: report.supplyCylOil?.toString() || '',
      supplyMeOil: report.supplyMeOil?.toString() || '',
      supplyAeOil: report.supplyAeOil?.toString() || '',

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

      engineUnits: report.engineUnits?.map((eu: ReportEngineUnit) => ({ // Added type for eu
        unitNumber: eu.unitNumber,
        exhaustTemp: eu.exhaustTemp?.toString() || '',
        underPistonAir: eu.underPistonAir?.toString() || '',
        pcoOutletTemp: eu.pcoOutletTemp?.toString() || '',
        jcfwOutletTemp: eu.jcfwOutletTemp?.toString() || '',
      })) || initializeEngineUnits(),
      auxEngines: report.auxEngines?.map((ae: ReportAuxEngine) => ({ // Added type for ae
        engineName: ae.engineName,
        load: ae.load?.toString() || '',
        kw: ae.kw?.toString() || '',
        foPress: ae.foPress?.toString() || '',
        lubOilPress: ae.lubOilPress?.toString() || '',
        waterTemp: ae.waterTemp?.toString() || '',
        dailyRunHour: ae.dailyRunHour?.toString() || '',
      })) || initializeAuxEngines(),
    };
  };

  useEffect(() => {
    const fetchVesselInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<VesselInfo>('/vessels/my-vessel'); 
        const fetchedData = response.data;
        setVesselInfo(fetchedData);
        setFormData(prev => ({ ...prev, vesselId: fetchedData.id })); 
      } catch (err) {
        setError('Failed to fetch vessel information.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVesselInfo();
  }, []);

  useEffect(() => {
    if (isModifyMode && reportIdToModify && !initialReportData) {
      const fetchReportToModify = async () => {
        setIsLoadingReportToModify(true);
        setError(null);
        try {
          const response = await apiClient.get<FullReportViewDTO>(`/reports/${reportIdToModify}`);
          const fetchedReport = response.data;
          setInitialReportData(fetchedReport);
          setFormData(mapReportToFormData(fetchedReport));
          setActiveModificationChecklist(fetchedReport.modification_checklist || []);
          setOfficeChangesComment(fetchedReport.requested_changes_comment || null);
        } catch (err) {
          setError('Failed to fetch report data for modification.');
          console.error(err);
        } finally {
          setIsLoadingReportToModify(false);
        }
      };
      fetchReportToModify();
    } else if (isModifyMode && initialReportData) {
        // If initialData was passed as a prop, map it
        setFormData(mapReportToFormData(initialReportData));
        setActiveModificationChecklist(initialReportData.modification_checklist || []);
        setOfficeChangesComment(initialReportData.requested_changes_comment || null);
    }
  }, [isModifyMode, reportIdToModify, initialReportData]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Ensure type safety for direction fields if needed, though current logic is okay
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- Editability Logic ---
  const isFieldEditable = (fieldName: string): boolean => {
    if (!isModifyMode) return true; // All fields editable if not in modify mode
    return activeModificationChecklist.some(itemId => {
      const checklistItem = arrivalAnchorNoonChecklistItems.find(ci => ci.id === itemId);
      return checklistItem?.fields_affected.includes(fieldName);
    });
  };

  const isSectionEditable = (sectionIdPrefix: string): boolean => {
    if (!isModifyMode) return true;
    // Check if any checklist item related to this section prefix is active
    return activeModificationChecklist.some(itemId => itemId.startsWith(sectionIdPrefix));
  };

  const handleCoordinateChange = (
    prefix: 'noonLat' | 'noonLon', // Simplified prefixes
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

  const handleEngineUnitChange = (index: number, field: keyof Omit<EngineUnitData, 'unitNumber'>, value: string) => {
    setFormData(prev => {
      const updatedUnits = [...(prev.engineUnits || [])];
      if (updatedUnits[index]) {
        updatedUnits[index] = { ...updatedUnits[index], [field]: value };
      }
      return { ...prev, engineUnits: updatedUnits };
    });
  };

  const handleAuxEngineChange = (index: number, field: keyof Omit<AuxEngineData, 'engineName'>, value: string) => {
    setFormData(prev => {
      const updatedAux = [...(prev.auxEngines || [])];
      if (updatedAux[index]) {
        updatedAux[index] = { ...updatedAux[index], [field]: value };
      }
      return { ...prev, auxEngines: updatedAux };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const errors: string[] = [];
    const numericFields: (keyof ArrivalAnchorNoonFormData)[] = [
        'distanceSinceLastReport', 'windForce', 'seaState', 'swellHeight',
        'noonLatDeg', 'noonLatMin', 'noonLonDeg', 'noonLonMin', 'noonCourse',
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp',
        'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed'
    ];

    numericFields.forEach(field => {
        const value = formData[field as keyof ArrivalAnchorNoonFormData];
        if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
            errors.push(`${field} must be a valid number.`);
        }
    });

    formData.engineUnits?.forEach((unit) => {
        Object.entries(unit).forEach(([key, value]) => {
            if (key !== 'unitNumber' && value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
                errors.push(`Engine Unit #${unit.unitNumber} ${key} must be a valid number.`);
            }
        });
    });

    formData.auxEngines?.forEach((aux) => {
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

    const requiredFields: (keyof ArrivalAnchorNoonFormData)[] = [
        'reportDate', 'reportTime', 'timeZone', 'distanceSinceLastReport',
        'noonDate', 'noonTime', 
        'noonLatDeg', 'noonLatMin', 'noonLatDir',
        'noonLonDeg', 'noonLonMin', 'noonLonDir',
        'noonCourse', 'mePresentRpm', 'meCurrentSpeed'
        // Other base fields like weather, bunkers are validated by their specific sections or types
    ];
    for (const field of requiredFields) {
        if (!formData[field]) {
            setError(`Field "${field}" is required.`);
            setIsLoading(false);
            return;
        }
    }

    const payload = { ...formData };
    numericFields.forEach(field => {
        const key = field as keyof ArrivalAnchorNoonFormData;
        if (payload[key] !== '' && payload[key] !== undefined && payload[key] !== null) {
            (payload as any)[key] = parseFloat(payload[key] as string);
            if (isNaN((payload as any)[key])) {
                 (payload as any)[key] = null; 
            }
        } else {
             (payload as any)[key] = null; 
        }
    });
    
    payload.engineUnits = payload.engineUnits?.map(unit => {
        const convertedUnit = { ...unit };
        const unitNumericFields: (keyof Omit<EngineUnitData, 'unitNumber'>)[] = ['exhaustTemp', 'underPistonAir', 'pcoOutletTemp', 'jcfwOutletTemp'];
        unitNumericFields.forEach(field => {
            if (convertedUnit[field] !== '' && convertedUnit[field] !== undefined && convertedUnit[field] !== null) {
                (convertedUnit as any)[field] = parseFloat(convertedUnit[field] as string);
                 if (isNaN((convertedUnit as any)[field])) (convertedUnit as any)[field] = null;
            } else {
                 (convertedUnit as any)[field] = null;
            }
        });
        return convertedUnit;
    });
     payload.auxEngines = payload.auxEngines?.map(aux => {
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
        // Prepare payload with only editable fields
        const resubmitPayload: Partial<ArrivalAnchorNoonFormData> = {
          reportType: 'arrival_anchor_noon', // Ensure reportType is included
        };

        // Iterate over formData keys and add to payload if editable
        (Object.keys(formData) as Array<keyof ArrivalAnchorNoonFormData>).forEach(key => {
          if (key === 'engineUnits' || key === 'auxEngines') { // Handle array sections
            if (isFieldEditable(key)) { // Check if the whole section is editable
              // For simplicity, include the whole array if the section is marked for edit
              // A more granular approach would check individual fields within each array item
              (resubmitPayload as any)[key] = (payload as any)[key];
            }
          } else if (isFieldEditable(key)) {
            (resubmitPayload as any)[key] = (payload as any)[key];
          }
        });
        
        // Include vesselId if not already part of editable fields but required by backend
        if (!resubmitPayload.vesselId && formData.vesselId) {
            resubmitPayload.vesselId = formData.vesselId;
        }


        await apiClient.patch(`/reports/${reportIdToModify}/resubmit`, resubmitPayload);
        setSuccess('Report updated successfully!');
        setTimeout(() => navigate('/captain/report-history'), 2000); // Navigate to history or dashboard
      } else {
        await apiClient.post('/reports', payload as ArrivalAnchorNoonFormData);
        setSuccess('Arrival Anchor Noon Report submitted successfully!');
        setTimeout(() => navigate('/captain'), 1500);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit report.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderVesselInfo = () => {
    if (!vesselInfo) return <p>Loading vessel info...</p>;
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

  return (
    <> 
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Arrival Anchor Noon Report</h2>
      {renderVesselInfo()}

      {isModifyMode && (
        <div className="my-4 p-4 border rounded bg-yellow-50 border-yellow-300">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Office Change Request</h3>
          {officeChangesComment && (
            <div className="mb-3">
              <p className="font-medium text-yellow-700">Comment:</p>
              <p className="text-yellow-900 whitespace-pre-wrap">{officeChangesComment}</p>
            </div>
          )}
          {activeModificationChecklist.length > 0 && (
            <div>
              <p className="font-medium text-yellow-700">Requested changes for:</p>
              <ul className="list-disc list-inside ml-4 text-yellow-900">
                {activeModificationChecklist.map(itemId => {
                  const item = arrivalAnchorNoonChecklistItems.find(ci => ci.id === itemId);
                  return <li key={itemId}>{item ? item.label : itemId}</li>;
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md">
        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">General Info</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
                <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">Report Date</label>
                <input type="date" id="reportDate" name="reportDate" value={formData.reportDate} onChange={handleChange} required readOnly={!isFieldEditable('reportDate')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isFieldEditable('reportDate') ? 'bg-gray-100' : ''}`}/>
            </div>
             <div>
                <label htmlFor="reportTime" className="block text-sm font-medium text-gray-700">Report Time</label>
                <input type="time" id="reportTime" name="reportTime" value={formData.reportTime} onChange={handleChange} required readOnly={!isFieldEditable('reportTime')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isFieldEditable('reportTime') ? 'bg-gray-100' : ''}`}/>
            </div>
             <div>
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">Time Zone</label>
                <input type="text" id="timeZone" name="timeZone" value={formData.timeZone} onChange={handleChange} required placeholder="e.g., UTC+3" readOnly={!isFieldEditable('timeZone')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isFieldEditable('timeZone') ? 'bg-gray-100' : ''}`}/>
            </div>
          </div>
        </fieldset>

        <fieldset className="border p-4 rounded">
            <legend className="text-lg font-medium px-2">Position, Course & Distance</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label htmlFor="noonDate" className="block text-sm font-medium text-gray-700">Date</label><input type="date" id="noonDate" name="noonDate" value={formData.noonDate} onChange={handleChange} required readOnly={!isFieldEditable('noonDate')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isFieldEditable('noonDate') ? 'bg-gray-100' : ''}`} /></div>
                <div><label htmlFor="noonTime" className="block text-sm font-medium text-gray-700">Time</label><input type="time" id="noonTime" name="noonTime" value={formData.noonTime} onChange={handleChange} required readOnly={!isFieldEditable('noonTime')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isFieldEditable('noonTime') ? 'bg-gray-100' : ''}`} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                 <CoordinateInputGroup
                    label="Latitude"
                    idPrefix="noonLat"
                    degreeValue={formData.noonLatDeg ?? ''}
                    minuteValue={formData.noonLatMin ?? ''}
                    directionValue={formData.noonLatDir ?? 'N'}
                    onDegreeChange={(e) => handleCoordinateChange('noonLat', 'Deg', e.target.value)}
                    onMinuteChange={(e) => handleCoordinateChange('noonLat', 'Min', e.target.value)}
                    onDirectionChange={(e) => handleCoordinateChange('noonLat', 'Dir', e.target.value)}
                    directionOptions={['N', 'S']}
                    required={true}
                    disabled={!isFieldEditable('noonLatDeg')}
                 />
                 <CoordinateInputGroup
                    label="Longitude"
                    idPrefix="noonLon"
                    degreeValue={formData.noonLonDeg ?? ''}
                    minuteValue={formData.noonLonMin ?? ''}
                    directionValue={formData.noonLonDir ?? 'E'}
                    onDegreeChange={(e) => handleCoordinateChange('noonLon', 'Deg', e.target.value)}
                    onMinuteChange={(e) => handleCoordinateChange('noonLon', 'Min', e.target.value)}
                    onDirectionChange={(e) => handleCoordinateChange('noonLon', 'Dir', e.target.value)}
                    directionOptions={['E', 'W']}
                    required={true}
                    disabled={!isFieldEditable('noonLonDeg')}
                 />
                <div><label htmlFor="noonCourse" className="block text-sm font-medium text-gray-700">Course (°)</label><input type="number" step="any" id="noonCourse" name="noonCourse" value={formData.noonCourse} onChange={handleChange} required min="0" max="360" readOnly={!isFieldEditable('noonCourse')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isFieldEditable('noonCourse') ? 'bg-gray-100' : ''}`} /></div>
            </div>
             <div>
                <label htmlFor="distanceSinceLastReport" className="block text-sm font-medium text-gray-700">Distance Since Last Report (NM)</label>
                <input type="number" step="0.1" id="distanceSinceLastReport" name="distanceSinceLastReport" value={formData.distanceSinceLastReport} onChange={handleChange} required readOnly={!isFieldEditable('distanceSinceLastReport')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isFieldEditable('distanceSinceLastReport') ? 'bg-gray-100' : ''}`} />
            </div>
        </fieldset>

        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Weather</legend> 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="windDirection" className="block text-sm font-medium text-gray-700">Wind Direction</label>
              <select id="windDirection" name="windDirection" value={formData.windDirection} onChange={handleChange} required disabled={!isFieldEditable('windDirection')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${!isFieldEditable('windDirection') ? 'bg-gray-100' : ''}`}>
                {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="windForce" className="block text-sm font-medium text-gray-700">Wind Force (Beaufort)</label>
              <input type="number" id="windForce" name="windForce" value={formData.windForce} onChange={handleChange} required min="0" max="12" readOnly={!isFieldEditable('windForce')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isFieldEditable('windForce') ? 'bg-gray-100' : ''}`}/>
            </div>
             <div>
              <label htmlFor="seaDirection" className="block text-sm font-medium text-gray-700">Sea Direction</label>
               <select id="seaDirection" name="seaDirection" value={formData.seaDirection} onChange={handleChange} required disabled={!isFieldEditable('seaDirection')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${!isFieldEditable('seaDirection') ? 'bg-gray-100' : ''}`}>
                 {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
               </select>
            </div>
             <div>
              <label htmlFor="seaState" className="block text-sm font-medium text-gray-700">Sea State (Douglas Scale)</label>
              <input type="number" id="seaState" name="seaState" value={formData.seaState} onChange={handleChange} required min="0" max="9" readOnly={!isFieldEditable('seaState')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isFieldEditable('seaState') ? 'bg-gray-100' : ''}`}/>
            </div>
             <div>
              <label htmlFor="swellDirection" className="block text-sm font-medium text-gray-700">Swell Direction</label>
               <select id="swellDirection" name="swellDirection" value={formData.swellDirection} onChange={handleChange} required disabled={!isFieldEditable('swellDirection')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${!isFieldEditable('swellDirection') ? 'bg-gray-100' : ''}`}>
                 {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
               </select>
            </div>
             <div>
              <label htmlFor="swellHeight" className="block text-sm font-medium text-gray-700">Swell Height (m)</label>
              <input type="number" step="0.1" id="swellHeight" name="swellHeight" value={formData.swellHeight} onChange={handleChange} required min="0" readOnly={!isFieldEditable('swellHeight')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isFieldEditable('swellHeight') ? 'bg-gray-100' : ''}`}/>
            </div>
          </div>
        </fieldset>

        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Bunkers</legend>
          <BunkerConsumptionSection
            formData={formData}
            handleChange={handleChange}
            isFieldEditable={isFieldEditable}
            disabled={!isSectionEditable('arrival_anchor_noon_bunker')}
          />
          <BunkerSupplySection
            formData={formData}
            handleChange={handleChange}
            title="Supply (Since Last)"
            isFieldEditable={isFieldEditable}
            disabled={!isSectionEditable('arrival_anchor_noon_bunker_supplies')}
          />
        </fieldset>

        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Machinery</legend>
          <MachineryMEParamsSection
            formData={formData}
            handleChange={handleChange}
            isTcRpm2Optional={true}
            includeDailyRunHours={true}
            isFieldEditable={isFieldEditable}
            disabled={!isSectionEditable('arrival_anchor_noon_machinery_me')}
          />
          <EngineUnitsSection
            engineUnits={formData.engineUnits || []}
            handleEngineUnitChange={handleEngineUnitChange}
            disabled={!isFieldEditable('engineUnits')}
          />
          <AuxEnginesSection
            auxEngines={formData.auxEngines || []}
            handleAuxEngineChange={handleAuxEngineChange}
            disabled={!isFieldEditable('auxEngines')}
          />
        </fieldset>

        <div className="pt-4"> 
          {error && <p className="text-red-600 mb-4">{error}</p>} 
          {success && <p className="text-green-600 mb-4">{success}</p>}
          <button
            type="submit"
            disabled={isLoading || !vesselInfo}
            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
              (isLoading || !vesselInfo) ? 'opacity-70 cursor-not-allowed' : '' 
            }`}
          >
            {isLoading ? 'Submitting...' : (isModifyMode ? 'Resubmit Report' : 'Submit Arrival Anchor Noon Report')}
          </button>
        </div>
      </form>
    </> 
  );
};

export default ArrivalAnchorNoonForm;
