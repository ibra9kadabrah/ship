// src/types/report.ts

// --- Enums and Basic Types ---
export type ReportType = 'departure' | 'noon' | 'arrival' | 'berth' | 'arrival_anchor_noon';
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
  // Bunker Data: Consumption Inputs (Mandatory for all reports, except ME/AE for Berth)
  meConsumptionLsifo?: number; // Made optional
  meConsumptionLsmgo?: number; // Made optional
  meConsumptionCylOil?: number; // Made optional
  meConsumptionMeOil?: number; // Made optional
  meConsumptionAeOil?: number; // Made optional
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
  // Machinery Data: Main Engine Parameters (Mandatory for all reports, except Berth)
  meFoPressure?: number; // Made optional
  meLubOilPressure?: number; // Made optional
  meFwInletTemp?: number; // Made optional
  meLoInletTemp?: number; // Made optional
  meScavengeAirTemp?: number; // Made optional
  meTcRpm1?: number; // Made optional
  meTcRpm2?: number; // Made optional
  meTcExhaustTempIn?: number; // Made optional
  meTcExhaustTempOut?: number; // Made optional
  meThrustBearingTemp?: number; // Made optional
  meDailyRunHours?: number; // Made optional
  mePresentRpm?: number; // Made optional
  meCurrentSpeed?: number; // Made optional
  // Machinery Data: Related Units/Engines (Optional Input, EngineUnits not used for Berth)
  engineUnits?: Omit<EngineUnitData, 'id' | 'reportId'>[]; // Already optional, keep as is
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
  // Main Engine Parameters (from DB) - Add mePresentRpm here as well
  meFoPressure?: number | null;
  meLubOilPressure?: number | null;
  meFwInletTemp?: number | null;
  meLoInletTemp?: number | null;
  meScavengeAirTemp?: number | null;
  meTcRpm1?: number | null;
  meTcRpm2?: number | null;
  meTcExhaustTempIn?: number | null;
  meTcExhaustTempOut?: number | null;
  meThrustBearingTemp?: number | null;
  meDailyRunHours?: number | null;
  mePresentRpm?: number | null; // Added Present RPM
  meCurrentSpeed?: number | null; // Added Current Speed
  // Calculated Performance Metrics (from DB)
  sailingTimeVoyage?: number | null;
  avgSpeedVoyage?: number | null;
  // Noon Report Specific Fields (from DB)
  passageState?: PassageState | null;
  noonDate?: string | null;
  noonTime?: string | null;
  noonLatDeg?: number | null;
  noonLatMin?: number | null;
  noonLatDir?: 'N' | 'S' | null;
  noonLonDeg?: number | null;
  noonLonMin?: number | null;
  noonLonDir?: 'E' | 'W' | null;
  noonCourse?: number | null; // Added noonCourse
  sospDate?: string | null;
  sospTime?: string | null;
  sospLatDeg?: number | null;
  sospLatMin?: number | null;
  sospLatDir?: 'N' | 'S' | null;
  sospLonDeg?: number | null;
  sospLonMin?: number | null;
  sospLonDir?: 'E' | 'W' | null;
  sospCourse?: number | null; // Added sospCourse
  rospDate?: string | null;
  rospTime?: string | null;
  rospLatDeg?: number | null;
  rospLatMin?: number | null;
  rospLatDir?: 'N' | 'S' | null;
  rospLonDeg?: number | null;
  rospLonMin?: number | null;
  rospLonDir?: 'E' | 'W' | null;
  rospCourse?: number | null; // Added rospCourse
  // Arrival Report Specific Fields (from DB)
  eospDate?: string | null;
  eospTime?: string | null;
  eospLatDeg?: number | null;
  eospLatMin?: number | null;
  eospLatDir?: 'N' | 'S' | null;
  eospLonDeg?: number | null;
  eospLonMin?: number | null;
  eospLonDir?: 'E' | 'W' | null;
  eospCourse?: number | null;
  estimatedBerthingDate?: string | null;
  estimatedBerthingTime?: string | null;
  // Berth Report Specific Fields (from DB)
  berthDate?: string | null;
  berthTime?: string | null;
  berthLatDeg?: number | null;
  berthLatMin?: number | null;
  berthLatDir?: 'N' | 'S' | null;
  berthLonDeg?: number | null;
  berthLonMin?: number | null;
  berthLonDir?: 'E' | 'W' | null;
  cargoLoaded?: number | null;
  cargoUnloaded?: number | null;
  // cargoQuantity is already in BaseReportData/DepartureSpecificData
  cargoOpsStartDate?: string | null;
  cargoOpsStartTime?: string | null;
  cargoOpsEndDate?: string | null;
  cargoOpsEndTime?: string | null;
  berthNumber?: string | null; // Added Berth Number
  // Bunker Data: Initial ROB Inputs (present on first departure report record)
  initialRobLsifo?: number | null;
  initialRobLsmgo?: number | null;
  initialRobCylOil?: number | null;
  initialRobMeOil?: number | null;
  initialRobAeOil?: number | null;
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
  faspLatDeg: number;
  faspLatMin: number;
  faspLatDir: 'N' | 'S';
  faspLonDeg: number;
  faspLonMin: number;
  faspLonDir: 'E' | 'W';
  faspCourse: number;
  // Distance Data (Required Input for Departure)
  harbourDistance: number;
  harbourTime: string; // Format HH:MM
  // distanceSinceLastReport is no longer an input for Departure
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
  noonLatDeg?: number;
  noonLatMin?: number;
  noonLatDir?: 'N' | 'S';
  noonLonDeg?: number;
  noonLonMin?: number;
  noonLonDir?: 'E' | 'W';
  noonCourse?: number; // Added noonCourse
  sospDate?: string;
  sospTime?: string;
  sospLatDeg?: number;
  sospLatMin?: number;
  sospLatDir?: 'N' | 'S';
  sospLonDeg?: number;
  sospLonMin?: number;
  sospLonDir?: 'E' | 'W';
  sospCourse?: number; // Added sospCourse
  rospDate?: string;
  rospTime?: string;
  rospLatDeg?: number;
  rospLatMin?: number;
  rospLatDir?: 'N' | 'S';
  rospLonDeg?: number;
  rospLonMin?: number;
  rospLonDir?: 'E' | 'W';
  rospCourse?: number; // Added rospCourse
}

// Arrival Report Data
export interface ArrivalSpecificData extends BaseReportData {
  reportType: 'arrival';
  // EOSP Data (Mandatory for Arrival)
  eospDate: string;
  eospTime: string;
  eospLatDeg: number;
  eospLatMin: number;
  eospLatDir: 'N' | 'S';
  eospLonDeg: number;
  eospLonMin: number;
  eospLonDir: 'E' | 'W';
  eospCourse: number;
  // Distance Data (Mandatory for Arrival)
  distanceSinceLastReport: number; 
  harbourDistance: number; 
  harbourTime: string; // Format HH:MM
  // Estimated Berthing (Mandatory for Arrival)
  estimatedBerthingDate: string;
  estimatedBerthingTime: string;
}

// Berth Report Data
export interface BerthSpecificData extends BaseReportData {
  reportType: 'berth';
  // Navigation Data (Mandatory for Berth)
  berthDate: string;
  berthTime: string;
  berthLatDeg: number;
  berthLatMin: number;
  berthLatDir: 'N' | 'S';
  berthLonDeg: number;
  berthLonMin: number;
  berthLonDir: 'E' | 'W';
  berthNumber: string; // Added Berth Number (Required)
  // Cargo Operations Data (Mandatory Times, Conditional Amounts)
  cargoLoaded?: number; // Input if initial state was 'Empty'
  cargoUnloaded?: number; // Input if initial state was 'Loaded'
  cargoOpsStartDate: string;
  cargoOpsStartTime: string;
  cargoOpsEndDate: string;
  cargoOpsEndTime: string;
  // distanceSinceLastReport is not an input for Berth
}

// Arrival Anchor Noon Report Data (Similar to Noon, but no SOSP/ROSP/PassageState)
export interface ArrivalAnchorNoonSpecificData extends BaseReportData {
  reportType: 'arrival_anchor_noon';
  distanceSinceLastReport: number; // Mandatory for this report type
  // Noon fields are always required
  noonDate: string; 
  noonTime: string; 
  noonLatDeg: number;
  noonLatMin: number;
  noonLatDir: 'N' | 'S';
  noonLonDeg: number;
  noonLonMin: number;
  noonLonDir: 'E' | 'W';
  noonCourse: number;
  // All other fields from BaseReportData (weather, bunkers, machinery) are inherited
}

// --- Union Types ---

// Union of all possible INPUT DTOs
export type CreateReportDTO =
  | DepartureSpecificData
  | NoonSpecificData
  | ArrivalSpecificData
  | BerthSpecificData
  | ArrivalAnchorNoonSpecificData;

// Union of all possible OUTPUT Report objects
export type Report = BaseReport & (
  | DepartureSpecificData
  | NoonSpecificData
  | ArrivalSpecificData
  | BerthSpecificData
  | ArrivalAnchorNoonSpecificData
);


// --- Other Existing Types ---
export interface ReviewReportDTO {
  status: 'approved' | 'rejected';
  reviewComments?: string;
}

// Enhanced DTO for viewing a report with related context
export type FullReportViewDTO = Report & { // Use type intersection instead of interface extends
  vesselName: string;
  captainName: string;
  voyageCargoQuantity?: number | null;
  voyageCargoType?: string | null;
  voyageCargoStatus?: CargoStatus | null;
  noonCourse?: number | null; 
  sospCourse?: number | null; // Added sospCourse
  rospCourse?: number | null; // Added rospCourse
  // Add calculated performance metrics to the view DTO as well
  sailingTimeVoyage?: number | null;
  avgSpeedVoyage?: number | null;
  berthNumber?: string | null; // Added Berth Number
}
