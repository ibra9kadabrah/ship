import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import apiClient, { getReportById } from '../../services/api'; 
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
import { NoonFormData, PassageState, CardinalDirection, EngineUnitData, AuxEngineData, FullReportViewDTO } from '../../types/report'; 
import { useNavigate } from 'react-router-dom';
import BunkerConsumptionSection from './sections/BunkerConsumptionSection';
import BunkerSupplySection from './sections/BunkerSupplySection';
import MachineryMEParamsSection from './sections/MachineryMEParamsSection';
import EngineUnitsSection from './sections/EngineUnitsSection';
import AuxEnginesSection from './sections/AuxEnginesSection';
import CoordinateInputGroup from './CoordinateInputGroup'; 
import { getChecklistForReportType, ChecklistItem } from '../../config/reportChecklists'; 

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

interface NoonFormProps {
  reportIdToModify?: string;
}

const NoonForm: React.FC<NoonFormProps> = ({ reportIdToModify }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [prevNoonState, setPrevNoonState] = useState<PassageState | null>(null);

  const isModifyMode = !!reportIdToModify;
  const [initialReportData, setInitialReportData] = useState<FullReportViewDTO | null>(null);
  const [activeModificationChecklist, setActiveModificationChecklist] = useState<string[]>([]);
  const [officeChangesComment, setOfficeChangesComment] = useState<string | null>(null);
  const [isLoadingReportToModify, setIsLoadingReportToModify] = useState(false);
  
  const [formData, setFormData] = useState<Partial<NoonFormData>>({
    reportType: 'noon',
    vesselId: '',
    reportDate: '',
    reportTime: '',
    timeZone: '',
    passageState: '', 
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
    sospDate: '', sospTime: '', 
    sospLatDeg: '', sospLatMin: '', sospLatDir: 'N', 
    sospLonDeg: '', sospLonMin: '', sospLonDir: 'E', 
    sospCourse: '', 
    rospDate: '', rospTime: '', 
    rospLatDeg: '', rospLatMin: '', rospLatDir: 'N', 
    rospLonDeg: '', rospLonMin: '', rospLonDir: 'E', 
    rospCourse: '', 
    windDirection: 'N', seaDirection: 'N', swellDirection: 'N',
    windForce: '', seaState: '', swellHeight: '',
    meConsumptionLsifo: '', meConsumptionLsmgo: '', meConsumptionCylOil: '', meConsumptionMeOil: '', meConsumptionAeOil: '',
    boilerConsumptionLsifo: '', boilerConsumptionLsmgo: '',
    auxConsumptionLsifo: '', auxConsumptionLsmgo: '',
    supplyLsifo: '', supplyLsmgo: '', supplyCylOil: '', supplyMeOil: '', supplyAeOil: '',
    meFoPressure: '', meLubOilPressure: '', meFwInletTemp: '', meLoInletTemp: '', meScavengeAirTemp: '',
    meTcRpm1: '', meTcRpm2: '', meTcExhaustTempIn: '', meTcExhaustTempOut: '', meThrustBearingTemp: '', meDailyRunHours: '',
    mePresentRpm: '', 
    meCurrentSpeed: '', 
    engineUnits: initializeEngineUnits(),
    auxEngines: initializeAuxEngines(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchVesselInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<VesselInfo>('/vessels/my-vessel');
        const fetchedData = response.data;
        setVesselInfo(fetchedData);
        setFormData(prev => ({ ...prev, vesselId: fetchedData.id }));
        setPrevNoonState(fetchedData.previousNoonPassageState ?? null);
      } catch (err) {
        setError('Failed to fetch vessel information.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    // Always fetch vessel info regardless of mode
    fetchVesselInfo();
  }, []);

  useEffect(() => {
    if (isModifyMode && reportIdToModify) {
      const fetchReportToModify = async () => {
        setIsLoadingReportToModify(true);
        setError(null);
        try {
          const report = await getReportById(reportIdToModify);
          setInitialReportData(report);

          // Set prevNoonState based on the context
          // User requested to not address the "Could not fetch previous noon state for voyage" for now.
          // The existing logic for fetching voyage state and fallback will remain.
          if (report.voyageId) {
            try {
              const voyageStateResponse = await apiClient.get<{ previousNoonPassageState: PassageState | null }>(`/voyages/${report.voyageId}/state`);
              setPrevNoonState(voyageStateResponse.data.previousNoonPassageState ?? null);
            } catch (voyageStateError) {
              console.warn(`Could not fetch previous noon state for voyage ${report.voyageId}:`, voyageStateError);
              setPrevNoonState(vesselInfo?.previousNoonPassageState ?? null);
            }
          } else {
            setPrevNoonState(vesselInfo?.previousNoonPassageState ?? null);
            console.warn(`Report ${report.id} (type: ${report.reportType}) being modified has no voyageId. Using general vessel prevNoonState if available.`);
          }
          
          const toStringOrEmpty = (val: number | null | undefined): string => val !== null && val !== undefined ? String(val) : '';

          const mappedData: Partial<NoonFormData> = {
            reportType: 'noon',
            vesselId: report.vesselId, // Use vesselId from the report being modified
            reportDate: report.reportDate || '',
            reportTime: report.reportTime || '',
            timeZone: report.timeZone || '',
            passageState: report.passageState || '',
            distanceSinceLastReport: toStringOrEmpty(report.distanceSinceLastReport),
            noonDate: report.noonDate || '',
            noonTime: report.noonTime || '',
            noonLatDeg: toStringOrEmpty(report.noonLatDeg),
            noonLatMin: toStringOrEmpty(report.noonLatMin),
            noonLatDir: report.noonLatDir || 'N',
            noonLonDeg: toStringOrEmpty(report.noonLonDeg),
            noonLonMin: toStringOrEmpty(report.noonLonMin),
            noonLonDir: report.noonLonDir || 'E',
            noonCourse: toStringOrEmpty(report.noonCourse),
            sospDate: report.sospDate || '',
            sospTime: report.sospTime || '',
            sospLatDeg: toStringOrEmpty(report.sospLatDeg),
            sospLatMin: toStringOrEmpty(report.sospLatMin),
            sospLatDir: report.sospLatDir || 'N',
            sospLonDeg: toStringOrEmpty(report.sospLonDeg),
            sospLonMin: toStringOrEmpty(report.sospLonMin),
            sospLonDir: report.sospLonDir || 'E',
            sospCourse: toStringOrEmpty(report.sospCourse),
            rospDate: report.rospDate || '',
            rospTime: report.rospTime || '',
            rospLatDeg: toStringOrEmpty(report.rospLatDeg),
            rospLatMin: toStringOrEmpty(report.rospLatMin),
            rospLatDir: report.rospLatDir || 'N',
            rospLonDeg: toStringOrEmpty(report.rospLonDeg),
            rospLonMin: toStringOrEmpty(report.rospLonMin),
            rospLonDir: report.rospLonDir || 'E',
            rospCourse: toStringOrEmpty(report.rospCourse),
            windDirection: report.windDirection || 'N',
            seaDirection: report.seaDirection || 'N',
            swellDirection: report.swellDirection || 'N',
            windForce: toStringOrEmpty(report.windForce),
            seaState: toStringOrEmpty(report.seaState),
            swellHeight: toStringOrEmpty(report.swellHeight),
            meConsumptionLsifo: toStringOrEmpty(report.meConsumptionLsifo),
            meConsumptionLsmgo: toStringOrEmpty(report.meConsumptionLsmgo),
            meConsumptionCylOil: toStringOrEmpty(report.meConsumptionCylOil),
            meConsumptionMeOil: toStringOrEmpty(report.meConsumptionMeOil),
            meConsumptionAeOil: toStringOrEmpty(report.meConsumptionAeOil),
            boilerConsumptionLsifo: toStringOrEmpty(report.boilerConsumptionLsifo),
            boilerConsumptionLsmgo: toStringOrEmpty(report.boilerConsumptionLsmgo),
            auxConsumptionLsifo: toStringOrEmpty(report.auxConsumptionLsifo),
            auxConsumptionLsmgo: toStringOrEmpty(report.auxConsumptionLsmgo),
            supplyLsifo: toStringOrEmpty(report.supplyLsifo),
            supplyLsmgo: toStringOrEmpty(report.supplyLsmgo),
            supplyCylOil: toStringOrEmpty(report.supplyCylOil),
            supplyMeOil: toStringOrEmpty(report.supplyMeOil),
            supplyAeOil: toStringOrEmpty(report.supplyAeOil),
            meFoPressure: toStringOrEmpty(report.meFoPressure),
            meLubOilPressure: toStringOrEmpty(report.meLubOilPressure),
            meFwInletTemp: toStringOrEmpty(report.meFwInletTemp),
            meLoInletTemp: toStringOrEmpty(report.meLoInletTemp),
            meScavengeAirTemp: toStringOrEmpty(report.meScavengeAirTemp),
            meTcRpm1: toStringOrEmpty(report.meTcRpm1),
            meTcRpm2: toStringOrEmpty(report.meTcRpm2),
            meTcExhaustTempIn: toStringOrEmpty(report.meTcExhaustTempIn),
            meTcExhaustTempOut: toStringOrEmpty(report.meTcExhaustTempOut),
            meThrustBearingTemp: toStringOrEmpty(report.meThrustBearingTemp),
            meDailyRunHours: toStringOrEmpty(report.meDailyRunHours),
            mePresentRpm: toStringOrEmpty(report.mePresentRpm),
            meCurrentSpeed: toStringOrEmpty(report.meCurrentSpeed),
            engineUnits: report.engineUnits?.map(u => ({ ...u, exhaustTemp: toStringOrEmpty(u.exhaustTemp), underPistonAir: toStringOrEmpty(u.underPistonAir), pcoOutletTemp: toStringOrEmpty(u.pcoOutletTemp), jcfwOutletTemp: toStringOrEmpty(u.jcfwOutletTemp) })) || initializeEngineUnits(),
            auxEngines: report.auxEngines?.map(a => ({ ...a, load: toStringOrEmpty(a.load), kw: toStringOrEmpty(a.kw), foPress: toStringOrEmpty(a.foPress), lubOilPress: toStringOrEmpty(a.lubOilPress), waterTemp: toStringOrEmpty(a.waterTemp), dailyRunHour: toStringOrEmpty(a.dailyRunHour) })) || initializeAuxEngines(),
          };
          console.log("Fetched report.distanceSinceLastReport:", report.distanceSinceLastReport); // Log fetched value
          console.log("Mapped distanceSinceLastReport for formData:", mappedData.distanceSinceLastReport); // Log value being set to formData
          setFormData(mappedData);
          const checklist = report.modification_checklist || [];
          setActiveModificationChecklist(checklist);
          console.log("Active Modification Checklist:", checklist);
          setOfficeChangesComment(report.requested_changes_comment || null);
        } catch (err: any) {
          console.error("Error fetching report to modify:", err);
          setError(err.response?.data?.error || "Failed to load report data for modification.");
        } finally {
          setIsLoadingReportToModify(false);
        }
      };
      fetchReportToModify();
    }
  }, [reportIdToModify, isModifyMode]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.endsWith('LatDir') || name.endsWith('LonDir')) {
      setFormData(prev => ({ ...prev, [name]: value as 'N' | 'S' | 'E' | 'W' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCoordinateChange = (
    prefix: 'noonLat' | 'noonLon' | 'sospLat' | 'sospLon' | 'rospLat' | 'rospLon', 
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

  const isFieldEditable = (fieldName: string): boolean => {
    if (!isModifyMode) return true;
    if (!initialReportData || activeModificationChecklist.length === 0) {
      // Display error message instead of silently failing
      if (!initialReportData) console.error("Cannot edit fields: initialReportData is null");
      if (activeModificationChecklist.length === 0) console.error("Cannot edit fields: no modification checklist items");
      return false;
    }

    const noonChecklist = getChecklistForReportType('noon');
    
    if (fieldName.startsWith('sosp') && activeModificationChecklist.includes('noon_sosp_details')) {
        return formData.passageState === 'SOSP';
    }
    if (fieldName.startsWith('rosp') && activeModificationChecklist.includes('noon_rosp_details')) {
        return formData.passageState === 'ROSP';
    }
    // The generic check below will now handle all fields correctly
    // based on their presence in the fields_affected array of active checklist items.
    return noonChecklist.some(item =>
      activeModificationChecklist.includes(item.id) && item.fields_affected.includes(fieldName)
    );
  };
  
  const isSectionEditable = (sectionChecklistId: string): boolean => {
    if (!isModifyMode) return true;
    if (activeModificationChecklist.length === 0) return false;
    return activeModificationChecklist.includes(sectionChecklistId);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const errors: string[] = [];
    const numericFields: (keyof NoonFormData)[] = [ 
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

    numericFields.forEach(field => {
        const value = formData[field as keyof NoonFormData];
        if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
            let isRequiredByState = true;
            if (field.startsWith('sosp') && formData.passageState !== 'SOSP') isRequiredByState = false;
            if (field.startsWith('rosp') && formData.passageState !== 'ROSP') isRequiredByState = false;
            if (isRequiredByState) errors.push(`${field} must be a valid number.`);
        }
    });

    const engineUnitNumericDataFields: (keyof Omit<EngineUnitData, 'unitNumber' | 'id' | 'reportId' | 'createdAt' | 'updatedAt'>)[] =
      ['exhaustTemp', 'underPistonAir', 'pcoOutletTemp', 'jcfwOutletTemp'];

    formData.engineUnits?.forEach((unit) => {
      engineUnitNumericDataFields.forEach(key => {
        const value = unit[key];
        if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
          errors.push(`Engine Unit #${unit.unitNumber} ${key} must be a valid number.`);
        }
      });
    });

    const auxEngineNumericDataFields: (keyof Omit<AuxEngineData, 'engineName' | 'id' | 'reportId' | 'createdAt' | 'updatedAt'>)[] =
      ['load', 'kw', 'foPress', 'lubOilPress', 'waterTemp', 'dailyRunHour'];

    formData.auxEngines?.forEach((aux) => {
      auxEngineNumericDataFields.forEach(key => {
        const value = aux[key];
        if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
          errors.push(`Aux Engine ${aux.engineName} ${key} must be a valid number.`);
        }
      });
    });

    if (errors.length > 0) {
        setError(errors.join(' '));
        setIsLoading(false);
        return;
    }
    
    const alwaysRequiredFields: (keyof NoonFormData)[] = [
        'reportDate', 'reportTime', 'timeZone', 'distanceSinceLastReport',
        'noonDate', 'noonTime', 
        'noonLatDeg', 'noonLatMin', 'noonLatDir', 
        'noonLonDeg', 'noonLonMin', 'noonLonDir', 
        'noonCourse', 'mePresentRpm', 'meCurrentSpeed'
    ];
    for (const field of alwaysRequiredFields) {
        if (!formData[field]) {
            setError(`Field "${field}" is required.`);
            setIsLoading(false);
            return;
        }
    }

    if (formData.passageState === 'SOSP' && (
        !formData.sospDate || !formData.sospTime || 
        !formData.sospLatDeg || !formData.sospLatMin || !formData.sospLatDir ||
        !formData.sospLonDeg || !formData.sospLonMin || !formData.sospLonDir ||
        !formData.sospCourse
    )) {
         setError('SOSP Date, Time, Latitude (Deg/Min/Dir), Longitude (Deg/Min/Dir), and Course are required when SOSP state is selected.');
         setIsLoading(false);
         return;
    }
     if (formData.passageState === 'ROSP' && (
        !formData.rospDate || !formData.rospTime || 
        !formData.rospLatDeg || !formData.rospLatMin || !formData.rospLatDir ||
        !formData.rospLonDeg || !formData.rospLonMin || !formData.rospLonDir ||
        !formData.rospCourse
     )) {
         setError('ROSP Date, Time, Latitude (Deg/Min/Dir), Longitude (Deg/Min/Dir), and Course are required when ROSP state is selected.');
         setIsLoading(false);
         return;
    }

    if (prevNoonState === 'SOSP' && !formData.passageState && !isModifyMode) { 
        setError('Passage state (SOSP/ROSP) is required because the previous Noon report was SOSP.');
        setIsLoading(false);
        return;
    }
    if (prevNoonState !== 'SOSP' && formData.passageState === 'ROSP' && !isModifyMode) { 
        setError('ROSP state is only allowed immediately following an SOSP state.');
        setIsLoading(false);
        return;
    }
    
    const payload = { ...formData }; 
    numericFields.forEach(field => {
        const key = field as keyof NoonFormData; 
        if (payload[key] !== '' && payload[key] !== undefined && payload[key] !== null) {
            (payload as any)[key] = parseFloat(payload[key] as string);
            if (isNaN((payload as any)[key])) (payload as any)[key] = null; 
        } else {
             (payload as any)[key] = null; 
        }
    });

    if (payload.passageState !== 'SOSP') {
        delete payload.sospDate; delete payload.sospTime; 
        delete payload.sospLatDeg; delete payload.sospLatMin; delete payload.sospLatDir;
        delete payload.sospLonDeg; delete payload.sospLonMin; delete payload.sospLonDir;
        delete payload.sospCourse;
    }
    if (payload.passageState !== 'ROSP') {
        delete payload.rospDate; delete payload.rospTime; 
        delete payload.rospLatDeg; delete payload.rospLatMin; delete payload.rospLatDir;
        delete payload.rospLonDeg; delete payload.rospLonMin; delete payload.rospLonDir;
        delete payload.rospCourse;
     }
    if (payload.passageState === '') {
        payload.passageState = null;
    }
    
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
        const noonChecklist = getChecklistForReportType('noon');
        const fieldsToSubmit: Partial<NoonFormData> = { reportType: 'noon' };
        let actualChangesMade = false;

        noonChecklist.forEach(checklistItem => {
          if (activeModificationChecklist.includes(checklistItem.id)) {
            checklistItem.fields_affected.forEach(fieldName => {
              const key = fieldName as keyof NoonFormData;
              if (Object.prototype.hasOwnProperty.call(formData, key)) { 
                const formValue = formData[key];
                const initialValueFromFetched = initialReportData ? (initialReportData as any)[key] : undefined;
                
                let transformedFormValue: any = formValue;
                if (numericFields.includes(key as any) && typeof formValue === 'string' && formValue.trim() !== '') {
                    transformedFormValue = Number(formValue);
                } else if (typeof formValue === 'string' && formValue.trim() === '' && numericFields.includes(key as any) ) {
                    transformedFormValue = null; 
                }
                
                (fieldsToSubmit as any)[key] = transformedFormValue;
                if (String(transformedFormValue) !== String(initialValueFromFetched)) {
                    actualChangesMade = true;
                }
              }
            });
          }
        });
        
        if (activeModificationChecklist.includes('noon_machinery_engine_units')) {
            fieldsToSubmit.engineUnits = payload.engineUnits?.map(unit => ({
                unitNumber: unit.unitNumber,
                exhaustTemp: unit.exhaustTemp,
                underPistonAir: unit.underPistonAir,
                pcoOutletTemp: unit.pcoOutletTemp,
                jcfwOutletTemp: unit.jcfwOutletTemp,
            }));
        }
        if (activeModificationChecklist.includes('noon_machinery_aux_engines')) {
            fieldsToSubmit.auxEngines = payload.auxEngines?.map(aux => ({
                engineName: aux.engineName,
                load: aux.load,
                kw: aux.kw,
                foPress: aux.foPress,
                lubOilPress: aux.lubOilPress,
                waterTemp: aux.waterTemp,
                dailyRunHour: aux.dailyRunHour,
            }));
        }
        
        // Check if actual changes were made to primitive fields OR if sub-records were intended to be submitted
        const hasSubRecordChanges =
            (activeModificationChecklist.includes('noon_machinery_engine_units') && fieldsToSubmit.engineUnits) ||
            (activeModificationChecklist.includes('noon_machinery_aux_engines') && fieldsToSubmit.auxEngines);

        if (!actualChangesMade && Object.keys(fieldsToSubmit).length <= 1 && !hasSubRecordChanges) {
            setError("No changes were made to the editable fields.");
            setIsLoading(false);
            return;
        }

        await apiClient.patch(`/reports/${reportIdToModify}/resubmit`, fieldsToSubmit);
        setSuccess("Modified Noon report submitted successfully!");
        setTimeout(() => navigate('/captain/history'), 1500);
      } else {
        await apiClient.post('/reports', payload as NoonFormData); 
        setSuccess('Noon report submitted successfully!');
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
    if (!vesselInfo && !initialReportData) return <p>Loading vessel info...</p>;
    const displayVesselName = initialReportData?.vesselName || vesselInfo?.name;
    const displayCaptainName = initialReportData?.captainName || user?.name;
    const displayImo = vesselInfo?.imoNumber; 
    const displayDwt = vesselInfo?.deadweight;

    return (
      <div className="mb-4 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold text-lg mb-2">Vessel Information</h3>
        {displayVesselName && <p><strong>Name:</strong> {displayVesselName}</p>}
        {displayImo && <p><strong>IMO:</strong> {displayImo}</p>}
        {displayDwt && <p><strong>DWT:</strong> {displayDwt}</p>}
        {displayCaptainName && <p><strong>Captain:</strong> {displayCaptainName}</p>}
      </div>
    );
  };

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
        {isModifyMode && initialReportData ? `Modify Noon Report (ID: ${initialReportData.id.substring(0,8)}...)` : 'New Noon Report'}
      </h2>
      
      {isModifyMode && isLoadingReportToModify ? (
        <p className="text-center p-4">Loading report details for modification...</p>
      ) : (
        <>
          {isModifyMode && officeChangesComment && (
            <div className="mb-6 p-4 border rounded bg-yellow-50 border-yellow-300">
              <h3 className="text-lg font-medium text-yellow-700 mb-1">Office Comments for Modification:</h3>
              <p className="text-sm text-yellow-800 whitespace-pre-wrap">{officeChangesComment}</p>
            </div>
          )}

          {renderVesselInfo()}

          <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md">
            <fieldset className="border p-4 rounded">
              <legend className="text-lg font-medium px-2">General Info</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">Report Date</label>
                  <input type="date" id="reportDate" name="reportDate" value={formData.reportDate} onChange={handleChange} required readOnly={isModifyMode && !isFieldEditable('reportDate')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('reportDate') ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                </div>
                <div>
                  <label htmlFor="reportTime" className="block text-sm font-medium text-gray-700">Report Time</label>
                  <input type="time" id="reportTime" name="reportTime" value={formData.reportTime} onChange={handleChange} required readOnly={isModifyMode && !isFieldEditable('reportTime')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('reportTime') ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                </div>
                <div>
                  <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">Time Zone</label>
                  <input type="text" id="timeZone" name="timeZone" value={formData.timeZone} onChange={handleChange} required placeholder="e.g., UTC+3" readOnly={isModifyMode && !isFieldEditable('timeZone')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('timeZone') ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                </div>
              </div>
            </fieldset>

            <fieldset className="border p-4 rounded">
              <legend className="text-lg font-medium px-2">Noon Position & Course</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label htmlFor="noonDate" className="block text-sm font-medium text-gray-700">Noon Date</label><input type="date" id="noonDate" name="noonDate" value={formData.noonDate} onChange={handleChange} required readOnly={isModifyMode && !isFieldEditable('noonDate')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('noonDate') ? 'bg-gray-100 cursor-not-allowed' : ''}`} /></div>
                <div><label htmlFor="noonTime" className="block text-sm font-medium text-gray-700">Noon Time</label><input type="time" id="noonTime" name="noonTime" value={formData.noonTime} onChange={handleChange} required readOnly={isModifyMode && !isFieldEditable('noonTime')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('noonTime') ? 'bg-gray-100 cursor-not-allowed' : ''}`} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CoordinateInputGroup
                  label="Noon Latitude"
                  idPrefix="noonLat"
                  degreeValue={formData.noonLatDeg ?? ''}
                  minuteValue={formData.noonLatMin ?? ''}
                  directionValue={formData.noonLatDir ?? 'N'}
                  onDegreeChange={(e) => handleCoordinateChange('noonLat', 'Deg', e.target.value)}
                  onMinuteChange={(e) => handleCoordinateChange('noonLat', 'Min', e.target.value)}
                  onDirectionChange={(e) => handleCoordinateChange('noonLat', 'Dir', e.target.value)}
                  directionOptions={['N', 'S']}
                  required={true}
                  readOnly={isModifyMode && !isSectionEditable('noon_position_course')}
                />
                <CoordinateInputGroup
                  label="Noon Longitude"
                  idPrefix="noonLon"
                  degreeValue={formData.noonLonDeg ?? ''}
                  minuteValue={formData.noonLonMin ?? ''}
                  directionValue={formData.noonLonDir ?? 'E'}
                  onDegreeChange={(e) => handleCoordinateChange('noonLon', 'Deg', e.target.value)}
                  onMinuteChange={(e) => handleCoordinateChange('noonLon', 'Min', e.target.value)}
                  onDirectionChange={(e) => handleCoordinateChange('noonLon', 'Dir', e.target.value)}
                  directionOptions={['E', 'W']}
                  required={true}
                  readOnly={isModifyMode && !isSectionEditable('noon_position_course')}
                />
                <div><label htmlFor="noonCourse" className="block text-sm font-medium text-gray-700">Noon Course (°)</label><input type="number" step="any" id="noonCourse" name="noonCourse" value={formData.noonCourse} onChange={handleChange} required min="0" max="360" readOnly={isModifyMode && !isFieldEditable('noonCourse')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('noonCourse') ? 'bg-gray-100 cursor-not-allowed' : ''}`} /></div>
              </div>
            </fieldset>

            <fieldset className="border p-4 rounded">
              <legend className="text-lg font-medium px-2">Passage State & Distance</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="passageState" className="block text-sm font-medium text-gray-700">Passage State (Optional)</label>
                  <select
                    id="passageState"
                    name="passageState"
                    value={formData.passageState ?? ''}
                    onChange={handleChange}
                    disabled={isModifyMode && !isFieldEditable('passageState')}
                    className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${isModifyMode && !isFieldEditable('passageState') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="" disabled={prevNoonState === 'SOSP' && !(isModifyMode && isFieldEditable('passageState'))}>-- Select SOSP/ROSP (Optional) --</option>
                    <option value="SOSP">SOSP</option>
                    <option value="ROSP" disabled={prevNoonState !== 'SOSP' && !(isModifyMode && isFieldEditable('passageState'))}>ROSP</option>
                  </select>
                  {prevNoonState === 'SOSP' && <p className="text-xs text-blue-600 mt-1">SOSP or ROSP required after previous SOSP.</p>}
                  {prevNoonState !== 'SOSP' && <p className="text-xs text-gray-500 mt-1">ROSP only allowed after SOSP.</p>}
                </div>
                <div>
                  <label htmlFor="distanceSinceLastReport" className="block text-sm font-medium text-gray-700">Distance Since Last (NM)</label>
                  <input type="number" step="0.1" id="distanceSinceLastReport" name="distanceSinceLastReport" value={formData.distanceSinceLastReport} onChange={handleChange} required readOnly={isModifyMode && !isFieldEditable('distanceSinceLastReport')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('distanceSinceLastReport') ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                </div>
              </div>
              {formData.passageState === 'SOSP' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded space-y-4">
                  <p className="text-sm text-yellow-700 font-medium">SOSP Details Required</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">SOSP Date</label><input type="date" name="sospDate" value={formData.sospDate} onChange={handleChange} required readOnly={isModifyMode && !isFieldEditable('sospDate')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('sospDate') ? 'bg-gray-100 cursor-not-allowed' : ''}`} /></div>
                    <div><label className="block text-sm font-medium text-gray-700">SOSP Time</label><input type="time" name="sospTime" value={formData.sospTime} onChange={handleChange} required readOnly={isModifyMode && !isFieldEditable('sospTime')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('sospTime') ? 'bg-gray-100 cursor-not-allowed' : ''}`} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CoordinateInputGroup label="SOSP Latitude" idPrefix="sospLat" degreeValue={formData.sospLatDeg ?? ''} minuteValue={formData.sospLatMin ?? ''} directionValue={formData.sospLatDir ?? 'N'} onDegreeChange={(e) => handleCoordinateChange('sospLat', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('sospLat', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('sospLat', 'Dir', e.target.value)} directionOptions={['N', 'S']} required={true} readOnly={isModifyMode && !isFieldEditable('noon_sosp_details')} />
                    <CoordinateInputGroup label="SOSP Longitude" idPrefix="sospLon" degreeValue={formData.sospLonDeg ?? ''} minuteValue={formData.sospLonMin ?? ''} directionValue={formData.sospLonDir ?? 'E'} onDegreeChange={(e) => handleCoordinateChange('sospLon', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('sospLon', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('sospLon', 'Dir', e.target.value)} directionOptions={['E', 'W']} required={true} readOnly={isModifyMode && !isFieldEditable('noon_sosp_details')} />
                    <div><label className="block text-sm font-medium text-gray-700">SOSP Course (°)</label><input type="number" step="any" name="sospCourse" value={formData.sospCourse} onChange={handleChange} required min="0" max="360" readOnly={isModifyMode && !isFieldEditable('sospCourse')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('sospCourse') ? 'bg-gray-100 cursor-not-allowed' : ''}`} /></div>
                  </div>
                </div>
              )}
              {formData.passageState === 'ROSP' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded space-y-4">
                  <p className="text-sm text-green-700 font-medium">ROSP Details Required</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">ROSP Date</label><input type="date" name="rospDate" value={formData.rospDate} onChange={handleChange} required readOnly={isModifyMode && !isFieldEditable('rospDate')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('rospDate') ? 'bg-gray-100 cursor-not-allowed' : ''}`} /></div>
                    <div><label className="block text-sm font-medium text-gray-700">ROSP Time</label><input type="time" name="rospTime" value={formData.rospTime} onChange={handleChange} required readOnly={isModifyMode && !isFieldEditable('rospTime')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('rospTime') ? 'bg-gray-100 cursor-not-allowed' : ''}`} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CoordinateInputGroup label="ROSP Latitude" idPrefix="rospLat" degreeValue={formData.rospLatDeg ?? ''} minuteValue={formData.rospLatMin ?? ''} directionValue={formData.rospLatDir ?? 'N'} onDegreeChange={(e) => handleCoordinateChange('rospLat', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('rospLat', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('rospLat', 'Dir', e.target.value)} directionOptions={['N', 'S']} required={true} readOnly={isModifyMode && !isFieldEditable('noon_rosp_details')} />
                    <CoordinateInputGroup label="ROSP Longitude" idPrefix="rospLon" degreeValue={formData.rospLonDeg ?? ''} minuteValue={formData.rospLonMin ?? ''} directionValue={formData.rospLonDir ?? 'E'} onDegreeChange={(e) => handleCoordinateChange('rospLon', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('rospLon', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('rospLon', 'Dir', e.target.value)} directionOptions={['E', 'W']} required={true} readOnly={isModifyMode && !isFieldEditable('noon_rosp_details')} />
                    <div><label className="block text-sm font-medium text-gray-700">ROSP Course (°)</label><input type="number" step="any" name="rospCourse" value={formData.rospCourse} onChange={handleChange} required min="0" max="360" readOnly={isModifyMode && !isFieldEditable('rospCourse')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('rospCourse') ? 'bg-gray-100 cursor-not-allowed' : ''}`} /></div>
                  </div>
                </div>
              )}
            </fieldset>

            <fieldset className="border p-4 rounded">
              <legend className="text-lg font-medium px-2">Weather</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="windDirection" className="block text-sm font-medium text-gray-700">Wind Direction</label>
                  <select id="windDirection" name="windDirection" value={formData.windDirection} onChange={handleChange} required disabled={isModifyMode && !isFieldEditable('windDirection')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${isModifyMode && !isFieldEditable('windDirection') ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                    {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="windForce" className="block text-sm font-medium text-gray-700">Wind Force (Beaufort)</label>
                  <input type="number" id="windForce" name="windForce" value={formData.windForce} onChange={handleChange} required min="0" max="12" readOnly={isModifyMode && !isFieldEditable('windForce')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('windForce') ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                </div>
                <div>
                  <label htmlFor="seaDirection" className="block text-sm font-medium text-gray-700">Sea Direction</label>
                  <select id="seaDirection" name="seaDirection" value={formData.seaDirection} onChange={handleChange} required disabled={isModifyMode && !isFieldEditable('seaDirection')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${isModifyMode && !isFieldEditable('seaDirection') ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                    {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="seaState" className="block text-sm font-medium text-gray-700">Sea State (Douglas Scale)</label>
                  <input type="number" id="seaState" name="seaState" value={formData.seaState} onChange={handleChange} required min="0" max="9" readOnly={isModifyMode && !isFieldEditable('seaState')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('seaState') ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                </div>
                <div>
                  <label htmlFor="swellDirection" className="block text-sm font-medium text-gray-700">Swell Direction</label>
                  <select id="swellDirection" name="swellDirection" value={formData.swellDirection} onChange={handleChange} required disabled={isModifyMode && !isFieldEditable('swellDirection')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${isModifyMode && !isFieldEditable('swellDirection') ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                    {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="swellHeight" className="block text-sm font-medium text-gray-700">Swell Height (m)</label>
                  <input type="number" step="0.1" id="swellHeight" name="swellHeight" value={formData.swellHeight} onChange={handleChange} required min="0" readOnly={isModifyMode && !isFieldEditable('swellHeight')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('swellHeight') ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                </div>
              </div>
            </fieldset>

            <fieldset className="border p-4 rounded">
              <legend className="text-lg font-medium px-2">Bunkers</legend>
              <BunkerConsumptionSection
                formData={formData}
                handleChange={handleChange}
                isReadOnly={isModifyMode && !(isSectionEditable('noon_bunker_me_cons') || isSectionEditable('noon_bunker_boiler_cons') || isSectionEditable('noon_bunker_aux_cons'))}
              />
              <BunkerSupplySection
                formData={formData}
                handleChange={handleChange}
                title="Supply (Since Last)"
                isReadOnly={isModifyMode && !isSectionEditable('noon_bunker_supplies')}
              />
            </fieldset>

            <fieldset className="border p-4 rounded">
              <legend className="text-lg font-medium px-2">Machinery</legend>
              <MachineryMEParamsSection
                formData={formData}
                handleChange={handleChange}
                isTcRpm2Optional={true}
                includeDailyRunHours={true}
                isReadOnly={isModifyMode && !(isSectionEditable('noon_machinery_me_press_temp') || isSectionEditable('noon_machinery_me_tc') || isSectionEditable('noon_machinery_me_run_perf'))}
              />
              <EngineUnitsSection
                engineUnits={formData.engineUnits || []}
                handleEngineUnitChange={handleEngineUnitChange}
                isReadOnly={isModifyMode && !isSectionEditable('noon_machinery_engine_units')}
              />
              <AuxEnginesSection
                auxEngines={formData.auxEngines || []}
                handleAuxEngineChange={handleAuxEngineChange}
                isReadOnly={isModifyMode && !isSectionEditable('noon_machinery_aux_engines')}
              />
            </fieldset>

            <div className="pt-4">
              {error && <p className="text-red-600 mb-4">{error}</p>}
              {success && <p className="text-green-600 mb-4">{success}</p>}
              <button
                type="submit"
                disabled={isLoading || (isModifyMode && isLoadingReportToModify)}
                className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
                  (isLoading || (isModifyMode && isLoadingReportToModify)) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
              >
                {isLoading ? 'Submitting...' : (isModifyMode ? 'Submit Modified Noon Report' : 'Submit Noon Report')}
              </button>
            </div>
          </form>
        </>
      )}
    </>
  );
};

export default NoonForm;
