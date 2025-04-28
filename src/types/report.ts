// src/types/report.ts

// --- Enums and Basic Types ---
export type ReportType = 'departure' | 'noon' | 'arrival' | 'berth';
export type ReportStatus = 'pending' | 'approved' | 'rejected';
export type CardinalDirection = 'N' | 'NE' | 'NW' | 'E' | 'SE' | 'S' | 'W' | 'SW';
export type CargoStatus = 'Loaded' | 'Empty';
export type PassageState = 'NOON' | 'SOSP' | 'ROSP'; // Added PassageState

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

// --- Base Data Interfaces ---

// Common fields expected as INPUT for most reports
// Made mandatory here as they are required for ALL report types eventually
export interface BaseReportData { // Exported
  vesselId: string;
  // General Info
  reportDate: string;
  reportTime: string;
  timeZone: string;
  // Weather Data (Now Mandatory for all reports per user request)
  windDirection: CardinalDirection;
  seaDirection: CardinalDirection;
  swellDirection: CardinalDirection;
  windForce: number;
  seaState: number;
  swellHeight: number;
  // Bunker Data: Consumption Inputs (Mandatory for all reports)
  meConsumptionLsifo: number;
  meConsumptionLsmgo: number;
  meConsumptionCylOil: number;
  meConsumptionMeOil: number;
  meConsumptionAeOil: number;
  boilerConsumptionLsifo: number;
  boilerConsumptionLsmgo: number;
  auxConsumptionLsifo: number;
  auxConsumptionLsmgo: number;
  // Bunker Data: Supply Inputs (Mandatory, can be 0)
  supplyLsifo: number;
  supplyLsmgo: number;
  supplyCylOil: number;
  supplyMeOil: number;
  supplyAeOil: number;
  // Machinery Data: Main Engine Parameters (Mandatory for all reports)
  meFoPressure: number;
  meLubOilPressure: number;
  meFwInletTemp: number;
  meLoInletTemp: number;
  meScavengeAirTemp: number;
  meTcRpm1: number;
  meTcRpm2: number; // Assuming TC#2 is always present if TC#1 is
  meTcExhaustTempIn: number;
  meTcExhaustTempOut: number;
  meThrustBearingTemp: number;
  meDailyRunHours: number;
  // Machinery Data: Related Units/Engines (Optional Input)
  engineUnits?: Omit<EngineUnitData, 'id' | 'reportId'>[];
  auxEngines?: Omit<AuxEngineData, 'id' | 'reportId'>[];
}

// Common fields present in the database record / OUTPUT object
export interface BaseReport { // Exported
  id: string;
  voyageId: string;
  vesselId: string; // Repeated from BaseReportData for clarity in output
  reportType: ReportType; // The discriminator
  status: ReportStatus;
  captainId: string;
  reviewerId?: string;
  reviewDate?: string;
  reviewComments?: string;
  // Calculated Bunker Fields (present in output)
  totalConsumptionLsifo?: number;
  totalConsumptionLsmgo?: number;
  totalConsumptionCylOil?: number;
  totalConsumptionMeOil?: number;
  totalConsumptionAeOil?: number;
  currentRobLsifo?: number;
  currentRobLsmgo?: number;
  currentRobCylOil?: number;
  currentRobMeOil?: number;
  currentRobAeOil?: number;
  // Calculated Distance (can be present on multiple report types)
  totalDistanceTravelled?: number | null; 
  distanceToGo?: number | null; 
  // Noon Report Specific Fields (from DB)
  passageState?: PassageState | null;
  noonDate?: string | null;
  noonTime?: string | null;
  noonLatitude?: number | null;
  noonLongitude?: number | null;
  sospDate?: string | null;
  sospTime?: string | null;
  sospLatitude?: number | null;
  sospLongitude?: number | null;
  rospDate?: string | null;
  rospTime?: string | null;
  rospLatitude?: number | null;
  rospLongitude?: number | null;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// --- Type-Specific Data Interfaces ---

export interface DepartureSpecificData extends BaseReportData {
  reportType: 'departure';
  // Voyage data (Required for Departure)
  departurePort: string;
  destinationPort: string;
  voyageDistance: number;
  etaDate: string;
  etaTime: string;
  fwdDraft: number; // Mandatory for Departure
  aftDraft: number; // Mandatory for Departure
  // Cargo information (Mandatory for Departure)
  cargoQuantity: number;
  cargoType: string;
  cargoStatus: CargoStatus;
  // FASP Data (Mandatory for Departure)
  faspDate: string;
  faspTime: string;
  faspLatitude: number;
  faspLongitude: number;
  faspCourse: number;
  // Distance Data (Required Input for Departure)
  harbourDistance: number;
  harbourTime: string; // Format HH:MM
  distanceSinceLastReport: number;
  // Calculated Distance fields moved to BaseReport
  // Bunker Data: Initial ROB Inputs (Optional Input - only required by backend for first report)
  initialRobLsifo?: number;
  initialRobLsmgo?: number;
  initialRobCylOil?: number;
  initialRobMeOil?: number;
  initialRobAeOil?: number;
}

// Noon Report Data
export interface NoonSpecificData extends BaseReportData {
  reportType: 'noon';
  passageState: PassageState; // Mandatory for Noon input
  distanceSinceLastReport: number; // Mandatory for Noon input
  // Conditional fields based on passageState (optional in the interface, validated at runtime)
  noonDate?: string;
  noonTime?: string;
  noonLatitude?: number;
  noonLongitude?: number;
  sospDate?: string;
  sospTime?: string;
  sospLatitude?: number;
  sospLongitude?: number;
  rospDate?: string;
  rospTime?: string;
  rospLatitude?: number;
  rospLongitude?: number;
}

// Placeholder for Arrival Report Data
export interface ArrivalSpecificData extends BaseReportData {
  reportType: 'arrival';
  // Add Arrival-specific fields here later
  distanceSinceLastReport: number; // Example
  // Calculated Distance fields moved to BaseReport
}

// Placeholder for Berth Report Data
export interface BerthSpecificData extends BaseReportData {
  reportType: 'berth';
  // Add Berth-specific fields here later
  distanceSinceLastReport?: number | null; // Add for type consistency, even if not used
}

// --- Union Types ---

// Union of all possible INPUT DTOs
export type CreateReportDTO =
  | DepartureSpecificData
  | NoonSpecificData
  | ArrivalSpecificData
  | BerthSpecificData;

// Union of all possible OUTPUT Report objects
export type Report = BaseReport & (
  | DepartureSpecificData
  | NoonSpecificData
  | ArrivalSpecificData
  | BerthSpecificData
);


// --- Other Existing Types ---
export interface ReviewReportDTO {
  status: 'approved' | 'rejected';
  reviewComments?: string;
}
