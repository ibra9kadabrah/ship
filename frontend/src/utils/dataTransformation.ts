import { FullReportViewDTO, EngineUnitData, AuxEngineData, ReportType, ReportEngineUnit, ReportAuxEngine, CardinalDirection, CargoStatus } from '../types/report'; // Adjusted path

// Helper to safely convert to string or return empty string
export const toStringOrEmpty = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined) {
    return '';
  }
  return String(val);
};

// Helper to convert form string values to numbers for the payload, defaulting to null if empty/invalid
export const toNumberOrNull = (val: string | number | undefined | null): number | null => {
  if (val === undefined || val === null || String(val).trim() === '') {
    return null;
  }
  const num = Number(val);
  return isNaN(num) ? null : num;
};

export const convertNumericStringsToNumbers = (payload: any, numericFields: string[]): any => {
  const converted = { ...payload };
  
  numericFields.forEach(field => {
    if (converted.hasOwnProperty(field)) {
      converted[field] = toNumberOrNull(converted[field]);
    }
  });
  
  return converted;
};

export const convertEngineUnitsToNumbers = (engineUnits?: EngineUnitData[]): EngineUnitData[] | undefined => {
  if (!engineUnits) return undefined;
  const numericFields: (keyof Omit<EngineUnitData, 'unitNumber' | 'id' | 'reportId' | 'createdAt' | 'updatedAt'>)[] = 
    ['exhaustTemp', 'underPistonAir', 'pcoOutletTemp', 'jcfwOutletTemp'];
  
  return engineUnits.map(unit => {
    const convertedUnit = { ...unit } as any; // Use 'as any' for intermediate manipulation
    numericFields.forEach(field => {
      convertedUnit[field] = toNumberOrNull(unit[field]);
    });
    return convertedUnit as EngineUnitData;
  });
};

export const convertAuxEnginesToNumbers = (auxEngines?: AuxEngineData[]): AuxEngineData[] | undefined => {
  if (!auxEngines) return undefined;
  const numericFields: (keyof Omit<AuxEngineData, 'engineName' | 'id' | 'reportId' | 'createdAt' | 'updatedAt'>)[] = 
    ['load', 'kw', 'foPress', 'lubOilPress', 'waterTemp', 'dailyRunHour'];
  
  return auxEngines.map(aux => {
    const convertedAux = { ...aux } as any;
    numericFields.forEach(field => {
      convertedAux[field] = toNumberOrNull(aux[field]);
    });
    return convertedAux as AuxEngineData;
  });
};


// This is a comprehensive mapper. Individual forms might only use parts of this.
export const mapReportToFormData = (
  report: FullReportViewDTO, 
  reportType: ReportType // Use the ReportType enum
): any => { // Return type 'any' for flexibility, specific forms will cast to their FormData type
  
  const initializeEngineUnitsForForm = (): EngineUnitData[] => 
    Array.from({ length: 8 }, (_, i) => ({ unitNumber: i + 1, exhaustTemp: '', underPistonAir: '', pcoOutletTemp: '', jcfwOutletTemp: '' }));
  
  const initializeAuxEnginesForForm = (): AuxEngineData[] => 
    ['DG1', 'DG2', 'V1'].map(name => ({ engineName: name, load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: '' }));

  const baseMapping = {
    reportType,
    vesselId: report.vesselId,
    reportDate: report.reportDate?.split('T')[0] || '',
    reportTime: report.reportTime || '',
    timeZone: report.timeZone || '',
    
    windDirection: report.windDirection || 'N' as CardinalDirection,
    windForce: toStringOrEmpty(report.windForce),
    seaDirection: report.seaDirection || 'N' as CardinalDirection,
    seaState: toStringOrEmpty(report.seaState),
    swellDirection: report.swellDirection || 'N' as CardinalDirection,
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
    
    engineUnits: report.engineUnits?.map((eu: ReportEngineUnit): EngineUnitData => ({
      unitNumber: eu.unitNumber,
      exhaustTemp: toStringOrEmpty(eu.exhaustTemp),
      underPistonAir: toStringOrEmpty(eu.underPistonAir),
      pcoOutletTemp: toStringOrEmpty(eu.pcoOutletTemp),
      jcfwOutletTemp: toStringOrEmpty(eu.jcfwOutletTemp),
    })) || initializeEngineUnitsForForm(),
    
    auxEngines: report.auxEngines?.map((ae: ReportAuxEngine): AuxEngineData => ({
      engineName: ae.engineName,
      load: toStringOrEmpty(ae.load),
      kw: toStringOrEmpty(ae.kw),
      foPress: toStringOrEmpty(ae.foPress),
      lubOilPress: toStringOrEmpty(ae.lubOilPress),
      waterTemp: toStringOrEmpty(ae.waterTemp),
      dailyRunHour: toStringOrEmpty(ae.dailyRunHour),
    })) || initializeAuxEnginesForForm(),
  };
  
  switch (reportType) {
    case 'departure':
      return {
        ...baseMapping,
        departurePort: report.departurePort || '',
        destinationPort: report.destinationPort || '',
        voyageDistance: toStringOrEmpty(report.voyageDistance),
        etaDate: report.etaDate?.split('T')[0] || '',
        etaTime: report.etaTime || '',
        fwdDraft: toStringOrEmpty(report.fwdDraft),
        aftDraft: toStringOrEmpty(report.aftDraft),
        cargoQuantity: toStringOrEmpty(report.cargoQuantity),
        cargoType: report.cargoType || '',
        cargoStatus: report.cargoStatus || 'Loaded' as CargoStatus,
        faspDate: report.faspDate?.split('T')[0] || '',
        faspTime: report.faspTime || '',
        faspLatDeg: toStringOrEmpty(report.faspLatDeg),
        faspLatMin: toStringOrEmpty(report.faspLatMin),
        faspLatDir: report.faspLatDir || 'N' as 'N' | 'S',
        faspLonDeg: toStringOrEmpty(report.faspLonDeg),
        faspLonMin: toStringOrEmpty(report.faspLonMin),
        faspLonDir: report.faspLonDir || 'E' as 'E' | 'W',
        faspCourse: toStringOrEmpty(report.faspCourse),
        harbourDistance: toStringOrEmpty(report.harbourDistance),
        harbourTime: report.harbourTime || '',
        initialRobLsifo: toStringOrEmpty(report.initialRobLsifo),
        initialRobLsmgo: toStringOrEmpty(report.initialRobLsmgo),
        initialRobCylOil: toStringOrEmpty(report.initialRobCylOil),
        initialRobMeOil: toStringOrEmpty(report.initialRobMeOil),
        initialRobAeOil: toStringOrEmpty(report.initialRobAeOil),
      };
      
    case 'arrival':
      return {
        ...baseMapping,
        eospDate: report.eospDate?.split('T')[0] || '',
        eospTime: report.eospTime || '',
        eospLatDeg: toStringOrEmpty(report.eospLatDeg),
        eospLatMin: toStringOrEmpty(report.eospLatMin),
        eospLatDir: report.eospLatDir || 'N' as 'N' | 'S',
        eospLonDeg: toStringOrEmpty(report.eospLonDeg),
        eospLonMin: toStringOrEmpty(report.eospLonMin),
        eospLonDir: report.eospLonDir || 'E' as 'E' | 'W',
        eospCourse: toStringOrEmpty(report.eospCourse),
        distanceSinceLastReport: toStringOrEmpty(report.distanceSinceLastReport),
        harbourDistance: toStringOrEmpty(report.harbourDistance),
        harbourTime: report.harbourTime || '',
        estimatedBerthingDate: report.estimatedBerthingDate?.split('T')[0] || '',
        estimatedBerthingTime: report.estimatedBerthingTime || '',
      };
      
    case 'noon':
      return {
        ...baseMapping,
        passageState: report.passageState || '',
        distanceSinceLastReport: toStringOrEmpty(report.distanceSinceLastReport),
        noonDate: report.noonDate?.split('T')[0] || '',
        noonTime: report.noonTime || '',
        noonLatDeg: toStringOrEmpty(report.noonLatDeg),
        noonLatMin: toStringOrEmpty(report.noonLatMin),
        noonLatDir: report.noonLatDir || 'N' as 'N' | 'S',
        noonLonDeg: toStringOrEmpty(report.noonLonDeg),
        noonLonMin: toStringOrEmpty(report.noonLonMin),
        noonLonDir: report.noonLonDir || 'E' as 'E' | 'W',
        noonCourse: toStringOrEmpty(report.noonCourse),
        sospDate: report.sospDate?.split('T')[0] || '',
        sospTime: report.sospTime || '',
        sospLatDeg: toStringOrEmpty(report.sospLatDeg),
        sospLatMin: toStringOrEmpty(report.sospLatMin),
        sospLatDir: report.sospLatDir || 'N' as 'N' | 'S',
        sospLonDeg: toStringOrEmpty(report.sospLonDeg),
        sospLonMin: toStringOrEmpty(report.sospLonMin),
        sospLonDir: report.sospLonDir || 'E' as 'E' | 'W',
        sospCourse: toStringOrEmpty(report.sospCourse),
        rospDate: report.rospDate?.split('T')[0] || '',
        rospTime: report.rospTime || '',
        rospLatDeg: toStringOrEmpty(report.rospLatDeg),
        rospLatMin: toStringOrEmpty(report.rospLatMin),
        rospLatDir: report.rospLatDir || 'N' as 'N' | 'S',
        rospLonDeg: toStringOrEmpty(report.rospLonDeg),
        rospLonMin: toStringOrEmpty(report.rospLonMin),
        rospLonDir: report.rospLonDir || 'E' as 'E' | 'W',
        rospCourse: toStringOrEmpty(report.rospCourse),
      };
      
    case 'berth':
      return {
        ...baseMapping,
        // Berth specific fields don't include ME params or EngineUnits from baseMapping
        // So we might need to exclude them or ensure they are optional in BerthFormData
        meFoPressure: undefined, // Example of explicitly undefining if not applicable
        // ... (undefine other non-applicable ME fields)
        engineUnits: undefined, // Berth form does not use engineUnits

        berthDate: report.berthDate?.split('T')[0] || '',
        berthTime: report.berthTime || '',
        berthLatDeg: toStringOrEmpty(report.berthLatDeg),
        berthLatMin: toStringOrEmpty(report.berthLatMin),
        berthLatDir: report.berthLatDir || 'N' as 'N' | 'S',
        berthLonDeg: toStringOrEmpty(report.berthLonDeg),
        berthLonMin: toStringOrEmpty(report.berthLonMin),
        berthLonDir: report.berthLonDir || 'E' as 'E' | 'W',
        berthNumber: report.berthNumber || '',
        cargoOpsStartDate: report.cargoOpsStartDate?.split('T')[0] || '',
        cargoOpsStartTime: report.cargoOpsStartTime || '',
        cargoOpsEndDate: report.cargoOpsEndDate?.split('T')[0] || '',
        cargoOpsEndTime: report.cargoOpsEndTime || '',
        cargoLoaded: toStringOrEmpty(report.cargoLoaded),
        cargoUnloaded: toStringOrEmpty(report.cargoUnloaded),
      };
      
    case 'arrival_anchor_noon':
      return {
        ...baseMapping,
        distanceSinceLastReport: toStringOrEmpty(report.distanceSinceLastReport),
        noonDate: report.noonDate?.split('T')[0] || '',
        noonTime: report.noonTime || '',
        noonLatDeg: toStringOrEmpty(report.noonLatDeg),
        noonLatMin: toStringOrEmpty(report.noonLatMin),
        noonLatDir: report.noonLatDir || 'N' as 'N' | 'S',
        noonLonDeg: toStringOrEmpty(report.noonLonDeg),
        noonLonMin: toStringOrEmpty(report.noonLonMin),
        noonLonDir: report.noonLonDir || 'E' as 'E' | 'W',
        noonCourse: toStringOrEmpty(report.noonCourse),
      };
      
    default:
      // Should not happen if reportType is correctly typed
      const _exhaustiveCheck: never = reportType;
      return baseMapping;
  }
};

// Prepares the final payload for submission, ensuring numeric conversions
export const prepareSubmissionPayload = (
  formData: any,
  numericFields: string[],
  transformEngineUnits?: (units: any) => any, // Optional transformer for engine units
  transformAuxEngines?: (engines: any) => any // Optional transformer for aux engines
): any => {
  let payload = { ...formData };
  payload = convertNumericStringsToNumbers(payload, numericFields);
  
  if (payload.engineUnits && typeof transformEngineUnits === 'function') {
    payload.engineUnits = transformEngineUnits(payload.engineUnits);
  } else if (payload.engineUnits) { // Fallback if no transformer provided but data exists
    payload.engineUnits = convertEngineUnitsToNumbers(payload.engineUnits);
  }

  if (payload.auxEngines && typeof transformAuxEngines === 'function') {
    payload.auxEngines = transformAuxEngines(payload.auxEngines);
  } else if (payload.auxEngines) { // Fallback if no transformer provided but data exists
    payload.auxEngines = convertAuxEnginesToNumbers(payload.auxEngines);
  }
  
  // Clean up any fields that are empty strings but should be null/undefined if not applicable
  // Example: if passageState is empty, set to null
  if (payload.passageState === '') {
    payload.passageState = null;
  }
  // Conditional deletion of SOSP/ROSP fields based on passageState
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

  return payload;
};