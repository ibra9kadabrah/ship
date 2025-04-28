// src/types/report.ts
export type ReportType = 'departure' | 'noon' | 'arrival' | 'berth';
export type ReportStatus = 'pending' | 'approved' | 'rejected';
export type CardinalDirection = 'N' | 'NE' | 'NW' | 'E' | 'SE' | 'S' | 'W' | 'SW';

// --- Machinery Data Interfaces ---
export interface EngineUnitData {
  id?: string; // Present when reading from DB
  reportId?: string; // Present when reading from DB
  unitNumber: number; // 1-8
  exhaustTemp?: number;
  underPistonAir?: number;
  pcoOutletTemp?: number;
  jcfwOutletTemp?: number;
}

export interface AuxEngineData {
  id?: string; // Present when reading from DB
  reportId?: string; // Present when reading from DB
  engineName: string; // e.g., 'DG1', 'DG2', 'DG3', 'V1'
  load?: number;
  kw?: number;
  foPress?: number;
  lubOilPress?: number;
  waterTemp?: number;
  dailyRunHour?: number;
}
// --- End Machinery Data Interfaces ---


export interface Report {
  id: string;
  voyageId: string;
  vesselId: string;
  reportType: ReportType;
  status: ReportStatus;
  captainId: string;
  reviewerId?: string;
  reviewDate?: string;
  reviewComments?: string;
  
  // General information
  reportDate: string;
  reportTime: string;
  timeZone: string;
  
  // Voyage data
  departurePort?: string;
  destinationPort?: string;
  voyageDistance?: number;
  etaDate?: string;
  etaTime?: string;
  fwdDraft?: number; // Added
  aftDraft?: number; // Added

  // Cargo information
  cargoQuantity?: number;
  cargoType?: string;
  cargoStatus?: 'Loaded' | 'Empty';

  // FASP Data
  faspDate?: string;
  faspTime?: string;
  faspLatitude?: number;
  faspLongitude?: number;
  faspCourse?: number;

  // Distance Data
  harbourDistance?: number;
  harbourTime?: string;
  distanceSinceLastReport?: number;
  totalDistanceTravelled?: number;
  distanceToGo?: number;

  // Weather Data
  windDirection?: CardinalDirection;
  seaDirection?: CardinalDirection;
  swellDirection?: CardinalDirection;
  windForce?: number; // Beaufort scale 0-12
  seaState?: number; // Douglas scale 0-9
  swellHeight?: number; // Meters 0-9

  // Bunker Data: Consumption Inputs
  meConsumptionLsifo?: number;
  meConsumptionLsmgo?: number;
  meConsumptionCylOil?: number;
  meConsumptionMeOil?: number;
  meConsumptionAeOil?: number;
  boilerConsumptionLsifo?: number;
  boilerConsumptionLsmgo?: number;
  auxConsumptionLsifo?: number;
  auxConsumptionLsmgo?: number;

  // Bunker Data: Supply Inputs
  supplyLsifo?: number;
  supplyLsmgo?: number;
  supplyCylOil?: number;
  supplyMeOil?: number;
  supplyAeOil?: number;

  // Bunker Data: Calculated Total Consumptions
  totalConsumptionLsifo?: number;
  totalConsumptionLsmgo?: number;
  totalConsumptionCylOil?: number;
  totalConsumptionMeOil?: number;
  totalConsumptionAeOil?: number;

  // Bunker Data: Calculated Current ROBs
  currentRobLsifo?: number;
  currentRobLsmgo?: number;
  currentRobCylOil?: number;
  currentRobMeOil?: number;
  currentRobAeOil?: number;

  // Machinery Data: Main Engine Parameters
  meFoPressure?: number;
  meLubOilPressure?: number;
  meFwInletTemp?: number;
  meLoInletTemp?: number;
  meScavengeAirTemp?: number;
  meTcRpm1?: number;
  meTcRpm2?: number;
  meTcExhaustTempIn?: number;
  meTcExhaustTempOut?: number;
  meThrustBearingTemp?: number;
  meDailyRunHours?: number;

  // Machinery Data: Related Units/Engines (populated by model)
  engineUnits?: EngineUnitData[];
  auxEngines?: AuxEngineData[];
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartureReportDTO {
  vesselId: string;
  reportDate: string;
  reportTime: string;
  timeZone: string;
  departurePort: string;
  destinationPort: string;
  voyageDistance: number;
  etaDate: string;
  etaTime: string;
  fwdDraft?: number; // Added
  aftDraft?: number; // Added
  cargoQuantity?: number;
  cargoType?: string;
  cargoStatus?: 'Loaded' | 'Empty';

  // FASP Data (Optional Input)
  faspDate?: string;
  faspTime?: string;
  faspLatitude?: number;
  faspLongitude?: number;
  faspCourse?: number;

  // Distance Data (Required Input for Departure)
  harbourDistance: number;
  harbourTime: string; // Format HH:MM
  distanceSinceLastReport: number;

  // Weather Data (Optional Input)
  windDirection?: CardinalDirection;
  seaDirection?: CardinalDirection;
  swellDirection?: CardinalDirection;
  windForce?: number;
  seaState?: number;
  swellHeight?: number;

  // Bunker Data: Consumption Inputs (Optional)
  meConsumptionLsifo?: number;
  meConsumptionLsmgo?: number;
  meConsumptionCylOil?: number;
  meConsumptionMeOil?: number;
  meConsumptionAeOil?: number;
  boilerConsumptionLsifo?: number;
  boilerConsumptionLsmgo?: number;
  auxConsumptionLsifo?: number;
  auxConsumptionLsmgo?: number;

  // Bunker Data: Supply Inputs (Optional)
  supplyLsifo?: number;
  supplyLsmgo?: number;
  supplyCylOil?: number;
  supplyMeOil?: number;
  supplyAeOil?: number;

  // Bunker Data: Initial ROB Inputs (Optional - only required by backend for first report)
  initialRobLsifo?: number;
  initialRobLsmgo?: number;
  initialRobCylOil?: number;
  initialRobMeOil?: number;
  initialRobAeOil?: number;

  // Machinery Data: Main Engine Parameters (Optional Input)
  meFoPressure?: number;
  meLubOilPressure?: number;
  meFwInletTemp?: number;
  meLoInletTemp?: number;
  meScavengeAirTemp?: number;
  meTcRpm1?: number;
  meTcRpm2?: number;
  meTcExhaustTempIn?: number;
  meTcExhaustTempOut?: number;
  meThrustBearingTemp?: number;
  meDailyRunHours?: number;

  // Machinery Data: Related Units/Engines (Optional Input)
  // Use Omit to exclude fields not provided during creation
  engineUnits?: Omit<EngineUnitData, 'id' | 'reportId'>[]; 
  auxEngines?: Omit<AuxEngineData, 'id' | 'reportId'>[];
}

export interface ReviewReportDTO {
  status: 'approved' | 'rejected';
  reviewComments?: string;
}
