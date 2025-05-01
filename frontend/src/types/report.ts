// Frontend-specific report types

export type ReportType = 'departure' | 'noon' | 'arrival' | 'berth';
export type ReportStatus = 'pending' | 'approved' | 'rejected';

// Define the structure for report history items fetched from the backend
export interface ReportHistoryItem {
  id: string;
  reportDate: string;
  reportTime: string;
  reportType: ReportType;
  status: ReportStatus;
  voyageId?: string | null; 
  // Add other relevant fields displayed in the history table if needed
  departurePort?: string | null;
  destinationPort?: string | null; 
  // Add fields returned by backend joins for pending/all reports lists
  vesselName?: string;
  captainName?: string;
}

// --- Copied/Adapted from backend src/types/report.ts ---

export type CardinalDirection = 'N' | 'NE' | 'NW' | 'E' | 'SE' | 'S' | 'W' | 'SW';
export type CargoStatus = 'Loaded' | 'Empty';

// Base data needed for form inputs (subset of backend BaseReportData)
export interface BaseReportFormData { 
  reportDate: string;
  reportTime: string;
  timeZone: string;
  // Weather Data
  windDirection: CardinalDirection;
  seaDirection: CardinalDirection;
  swellDirection: CardinalDirection;
  windForce: number | string; // Use string initially for input flexibility
  seaState: number | string;
  swellHeight: number | string;
  // Bunker Data: Consumption Inputs
  meConsumptionLsifo: number | string;
  meConsumptionLsmgo: number | string;
  meConsumptionCylOil: number | string;
  meConsumptionMeOil: number | string;
  meConsumptionAeOil: number | string;
  boilerConsumptionLsifo: number | string;
  boilerConsumptionLsmgo: number | string;
  auxConsumptionLsifo: number | string;
  auxConsumptionLsmgo: number | string;
  // Bunker Data: Supply Inputs
  supplyLsifo: number | string;
  supplyLsmgo: number | string;
  supplyCylOil: number | string;
  supplyMeOil: number | string;
  supplyAeOil: number | string;
  // Machinery Data: Main Engine Parameters
  meFoPressure: number | string;
  meLubOilPressure: number | string;
  meFwInletTemp: number | string;
  meLoInletTemp: number | string;
  meScavengeAirTemp: number | string;
  meTcRpm1: number | string;
  meTcRpm2: number | string;
  meTcExhaustTempIn: number | string;
  meTcExhaustTempOut: number | string;
  meThrustBearingTemp: number | string;
  meDailyRunHours: number | string;
  // Machinery Data: Related Units/Engines (Simplified for now)
  // engineUnits?: any[]; // Define more specific types later if needed
  // auxEngines?: any[];
}

// Departure specific fields for the form payload
export interface DepartureSpecificData extends BaseReportFormData {
  reportType: 'departure'; // Discriminator
  vesselId: string; // Added, needed for payload
  // Voyage data
  departurePort: string;
  destinationPort: string;
  voyageDistance: number | string;
  etaDate: string;
  etaTime: string;
  fwdDraft: number | string; 
  aftDraft: number | string; 
  // Cargo information
  cargoQuantity: number | string;
  cargoType: string;
  cargoStatus: CargoStatus;
  // FASP Data
  faspDate: string;
  faspTime: string;
  faspLatitude: number | string;
  faspLongitude: number | string;
  faspCourse: number | string;
  // Distance Data
  harbourDistance: number | string;
  harbourTime: string; // Format HH:MM
  distanceSinceLastReport: number | string;
  // Bunker Data: Initial ROB Inputs (Optional Input)
  initialRobLsifo?: number | string;
  initialRobLsmgo?: number | string;
  initialRobCylOil?: number | string;
  initialRobMeOil?: number | string;
  initialRobAeOil?: number | string;
  // Use specific types for machinery arrays
  engineUnits?: EngineUnitData[]; 
  auxEngines?: AuxEngineData[]; 
}

// --- Machinery Data Interfaces (Frontend) ---
export interface EngineUnitData {
  // No IDs needed for input payload
  unitNumber: number; // 1-8
  exhaustTemp?: number | string;
  underPistonAir?: number | string;
  pcoOutletTemp?: number | string;
  jcfwOutletTemp?: number | string;
}

export interface AuxEngineData {
  // No IDs needed for input payload
  engineName: string; // e.g., 'DG1'
  load?: number | string;
  kw?: number | string;
  foPress?: number | string;
  lubOilPress?: number | string;
  waterTemp?: number | string;
  dailyRunHour?: number | string;
}

// --- New Types for Noon, Arrival, Berth Forms ---

export type PassageState = 'NOON' | 'SOSP' | 'ROSP';

// Noon specific fields for the form payload
export interface NoonFormData extends BaseReportFormData {
  reportType: 'noon';
  vesselId: string;
  passageState: PassageState;
  distanceSinceLastReport: number | string;
  // Conditional fields
  noonDate?: string;
  noonTime?: string;
  noonLatitude?: number | string;
  noonLongitude?: number | string;
  sospDate?: string;
  sospTime?: string;
  sospLatitude?: number | string;
  sospLongitude?: number | string;
  rospDate?: string;
  rospTime?: string;
  rospLatitude?: number | string;
  rospLongitude?: number | string;
  // Machinery
  engineUnits?: EngineUnitData[]; 
  auxEngines?: AuxEngineData[]; 
}

// Arrival specific fields for the form payload
export interface ArrivalFormData extends BaseReportFormData {
  reportType: 'arrival';
  vesselId: string;
  // EOSP Data
  eospDate: string;
  eospTime: string;
  eospLatitude: number | string;
  eospLongitude: number | string;
  eospCourse: number | string;
  // Distance Data
  distanceSinceLastReport: number | string; 
  harbourDistance: number | string; 
  harbourTime: string; // Format HH:MM
  // Estimated Berthing
  estimatedBerthingDate: string;
  estimatedBerthingTime: string;
  // Machinery
  engineUnits?: EngineUnitData[]; 
  auxEngines?: AuxEngineData[]; 
}

// Berth specific fields for the form payload
export interface BerthFormData extends BaseReportFormData {
  reportType: 'berth';
  vesselId: string;
  // Navigation Data
  berthDate: string;
  berthTime: string;
  berthLatitude: number | string;
  berthLongitude: number | string;
  // Cargo Operations Data
  cargoLoaded?: number | string; // Input if initial state was 'Empty'
  cargoUnloaded?: number | string; // Input if initial state was 'Loaded'
  cargoOpsStartDate: string;
  cargoOpsStartTime: string;
  cargoOpsEndDate: string;
  cargoOpsEndTime: string;
  // Machinery is required for Berth form submission as well
  engineUnits?: EngineUnitData[]; 
  auxEngines?: AuxEngineData[]; 
}

// Union type for all form data payloads
export type ReportFormData = 
  | DepartureSpecificData 
  | NoonFormData 
  | ArrivalFormData 
  | BerthFormData;

// Type for the response from GET /api/voyages/current/details
export interface CurrentVoyageDetails {
  voyageId: string;
  departurePort: string;
  destinationPort: string;
  initialCargoStatus: CargoStatus; 
}

// Represents the logical state of the voyage based on the latest report (from backend)
// Added 'NO_VESSEL_ASSIGNED' based on controller logic
export type VoyageState = 
  | 'NO_VOYAGE_ACTIVE' // Ready for Departure
  | 'DEPARTED'         // After Departure, before first Noon/Arrival
  | 'AT_SEA'           // After first Noon, before Arrival
  | 'ARRIVED'          // After Arrival, before first Berth
  | 'BERTHED'          // After first Berth, before next Departure
  | 'REPORT_PENDING'   // If the latest report is pending review
  | 'NO_VESSEL_ASSIGNED' // Captain has no vessel assigned
  | 'LOADING'          // Initial state while fetching
  | 'ERROR';           // State if fetching fails

// --- Full Report View DTO (for Review Page) ---
// Based on backend src/types/report.ts FullReportViewDTO

// First, define the base Report structure matching backend (excluding methods)
export interface Report {
  id: string;
  voyageId: string | null;
  vesselId: string;
  reportType: ReportType;
  status: ReportStatus;
  captainId: string;
  reviewerId: string | null;
  reviewDate: string | null;
  reviewComments: string | null;
  reportDate: string;
  reportTime: string;
  timeZone: string;
  departurePort: string | null;
  destinationPort: string | null;
  voyageDistance: number | null;
  etaDate: string | null;
  etaTime: string | null;
  fwdDraft: number | null;
  aftDraft: number | null;
  cargoQuantity: number | null;
  cargoType: string | null;
  cargoStatus: CargoStatus | null;
  faspDate: string | null;
  faspTime: string | null;
  faspLatitude: number | null;
  faspLongitude: number | null;
  faspCourse: number | null;
  harbourDistance: number | null;
  harbourTime: string | null;
  distanceSinceLastReport: number | null; // Input field, not stored directly
  totalDistanceTravelled: number | null; // Calculated
  distanceToGo: number | null; // Calculated
  windDirection: CardinalDirection | null;
  seaDirection: CardinalDirection | null;
  swellDirection: CardinalDirection | null;
  windForce: number | null;
  seaState: number | null;
  swellHeight: number | null;
  meConsumptionLsifo: number | null;
  meConsumptionLsmgo: number | null;
  meConsumptionCylOil: number | null;
  meConsumptionMeOil: number | null;
  meConsumptionAeOil: number | null;
  boilerConsumptionLsifo: number | null;
  boilerConsumptionLsmgo: number | null;
  auxConsumptionLsifo: number | null;
  auxConsumptionLsmgo: number | null;
  supplyLsifo: number | null;
  supplyLsmgo: number | null;
  supplyCylOil: number | null;
  supplyMeOil: number | null;
  supplyAeOil: number | null;
  totalConsumptionLsifo: number | null; // Calculated
  totalConsumptionLsmgo: number | null; // Calculated
  totalConsumptionCylOil: number | null; // Calculated
  totalConsumptionMeOil: number | null; // Calculated
  totalConsumptionAeOil: number | null; // Calculated
  currentRobLsifo: number | null; // Calculated
  currentRobLsmgo: number | null; // Calculated
  currentRobCylOil: number | null; // Calculated
  currentRobMeOil: number | null; // Calculated
  currentRobAeOil: number | null; // Calculated
  initialRobLsifo: number | null; // Stored from first departure input
  initialRobLsmgo: number | null;
  initialRobCylOil: number | null;
  initialRobMeOil: number | null;
  initialRobAeOil: number | null;
  meFoPressure: number | null;
  meLubOilPressure: number | null;
  meFwInletTemp: number | null;
  meLoInletTemp: number | null;
  meScavengeAirTemp: number | null;
  meTcRpm1: number | null;
  meTcRpm2: number | null;
  meTcExhaustTempIn: number | null;
  meTcExhaustTempOut: number | null;
  meThrustBearingTemp: number | null;
  meDailyRunHours: number | null;
  passageState: PassageState | null;
  noonDate: string | null;
  noonTime: string | null;
  noonLatitude: number | null;
  noonLongitude: number | null;
  sospDate: string | null;
  sospTime: string | null;
  sospLatitude: number | null;
  sospLongitude: number | null;
  rospDate: string | null;
  rospTime: string | null;
  rospLatitude: number | null;
  rospLongitude: number | null;
  eospDate: string | null;
  eospTime: string | null;
  eospLatitude: number | null;
  eospLongitude: number | null;
  eospCourse: number | null;
  estimatedBerthingDate: string | null;
  estimatedBerthingTime: string | null;
  berthDate: string | null;
  berthTime: string | null;
  berthLatitude: number | null;
  berthLongitude: number | null;
  cargoLoaded: number | null;
  cargoUnloaded: number | null;
  cargoOpsStartDate: string | null;
  cargoOpsStartTime: string | null;
  cargoOpsEndDate: string | null;
  cargoOpsEndTime: string | null;
  createdAt: string; // Added from backend schema
  updatedAt: string; // Added from backend schema
}

// Define the structure for the related machinery data (matching backend)
export interface ReportEngineUnit {
  id: string;
  reportId: string;
  unitNumber: number;
  exhaustTemp: number | null;
  underPistonAir: number | null;
  pcoOutletTemp: number | null;
  jcfwOutletTemp: number | null;
}

export interface ReportAuxEngine {
  id: string;
  reportId: string;
  engineName: string;
  load: number | null;
  kw: number | null;
  foPress: number | null;
  lubOilPress: number | null;
  waterTemp: number | null;
  dailyRunHour: number | null;
}

// Now define the FullReportViewDTO extending Report and adding related data
export interface FullReportViewDTO extends Report {
  engineUnits: ReportEngineUnit[];
  auxEngines: ReportAuxEngine[];
  vesselName: string; // Should always be present
  captainName: string; // Should always be present
  // Cargo details from the original departure report of the voyage
  voyageCargoQuantity: number | null;
  voyageCargoType: string | null;
  voyageCargoStatus: CargoStatus | null;
}
