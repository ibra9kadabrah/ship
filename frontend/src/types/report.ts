// Frontend-specific report types

export type ReportType = 'departure' | 'noon' | 'arrival' | 'berth' | 'arrival_anchor_noon';
export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

// Define the structure for report history items fetched from the backend
export interface ReportHistoryItem {
  id: string;
  reportDate: string;
  reportTime: string;
  reportType: ReportType;
  status: ReportStatus;
  voyageId?: string | null;
  vesselId: string; // Added vesselId
  // Add other relevant fields displayed in the history table if needed
  departurePort?: string | null;
  destinationPort?: string | null; 
  // Add fields returned by backend joins for pending/all reports lists
  vesselName?: string;
  captainName?: string;
  // Add course fields for Noon reports
  noonCourse?: number | null;
  sospCourse?: number | null;
  rospCourse?: number | null;
  berthNumber?: string | null; // Added Berth Number
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
  meConsumptionLsifo?: number | string; // Made optional
  meConsumptionLsmgo?: number | string; // Made optional
  meConsumptionCylOil?: number | string; // Made optional
  meConsumptionMeOil?: number | string; // Made optional
  meConsumptionAeOil?: number | string; // Made optional
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
  meFoPressure?: number | string; // Made optional
  meLubOilPressure?: number | string; // Made optional
  meFwInletTemp?: number | string; // Made optional
  meLoInletTemp?: number | string; // Made optional
  meScavengeAirTemp?: number | string; // Made optional
  meTcRpm1?: number | string; // Made optional
  meTcRpm2?: number | string; // Made optional
  meTcExhaustTempIn?: number | string; // Made optional
  meTcExhaustTempOut?: number | string; // Made optional
  meThrustBearingTemp?: number | string; // Made optional
  meDailyRunHours?: number | string; // Made optional
  mePresentRpm?: number | string; // Made optional
  meCurrentSpeed?: number | string; // Made optional
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
  faspLatDeg: number | string; // Changed to mandatory string/number for form
  faspLatMin: number | string; // Changed to mandatory string/number for form
  faspLatDir: 'N' | 'S';       // Changed to mandatory for form
  faspLonDeg: number | string; // Changed to mandatory string/number for form
  faspLonMin: number | string; // Changed to mandatory string/number for form
  faspLonDir: 'E' | 'W';       // Changed to mandatory for form
  faspCourse: number | string;
  // Distance Data
  harbourDistance: number | string;
  harbourTime: string; // Format HH:MM
  // distanceSinceLastReport: number | string; // Removed
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

// Allow empty string for unselected state in the form
export type PassageState = 'NOON' | 'SOSP' | 'ROSP' | ''; 

// Noon specific fields for the form payload
export interface NoonFormData extends BaseReportFormData {
  reportType: 'noon';
  vesselId: string;
  passageState: PassageState | null; // Allow null for payload preparation
  distanceSinceLastReport: number | string;
  // Noon fields (Make Deg/Min/Dir optional as they depend on passageState)
  noonDate?: string;
  noonTime?: string;
  noonLatDeg?: number | string;
  noonLatMin?: number | string;
  noonLatDir?: 'N' | 'S';
  noonLonDeg?: number | string;
  noonLonMin?: number | string;
  noonLonDir?: 'E' | 'W';
  noonCourse?: number | string; 
  // SOSP fields (Make Deg/Min/Dir optional)
  sospDate?: string;
  sospTime?: string;
  sospLatDeg?: number | string;
  sospLatMin?: number | string;
  sospLatDir?: 'N' | 'S';
  sospLonDeg?: number | string;
  sospLonMin?: number | string;
  sospLonDir?: 'E' | 'W';
  sospCourse?: number | string; 
  // ROSP fields (Make Deg/Min/Dir optional)
  rospDate?: string;
  rospTime?: string;
  rospLatDeg?: number | string;
  rospLatMin?: number | string;
  rospLatDir?: 'N' | 'S';
  rospLonDeg?: number | string;
  rospLonMin?: number | string;
  rospLonDir?: 'E' | 'W';
  rospCourse?: number | string; 
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
  eospLatDeg: number | string; // Changed to mandatory string/number for form
  eospLatMin: number | string; // Changed to mandatory string/number for form
  eospLatDir: 'N' | 'S';       // Changed to mandatory for form
  eospLonDeg: number | string; // Changed to mandatory string/number for form
  eospLonMin: number | string; // Changed to mandatory string/number for form
  eospLonDir: 'E' | 'W';       // Changed to mandatory for form
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
  berthLatDeg: number | string; // Changed to mandatory string/number for form
  berthLatMin: number | string; // Changed to mandatory string/number for form
  berthLatDir: 'N' | 'S';       // Changed to mandatory for form
  berthLonDeg: number | string; // Changed to mandatory string/number for form
  berthLonMin: number | string; // Changed to mandatory string/number for form
  berthLonDir: 'E' | 'W';       // Changed to mandatory for form
  berthNumber: string; // Added Berth Number (Required)
  // Cargo Operations Data
  cargoLoaded?: number | string; // Input if initial state was 'Empty'
  cargoUnloaded?: number | string; // Input if initial state was 'Loaded'
  cargoOpsStartDate: string;
  cargoOpsStartTime: string;
  cargoOpsEndDate: string;
  cargoOpsEndTime: string;
  // Machinery is required for Berth form submission as well
  // engineUnits removed from BerthFormData
  auxEngines?: AuxEngineData[]; 
}

// Arrival Anchor Noon specific fields for the form payload
export interface ArrivalAnchorNoonFormData extends BaseReportFormData {
  reportType: 'arrival_anchor_noon';
  vesselId: string;
  distanceSinceLastReport: number | string;
  // Noon fields (Required for this report type)
  noonDate: string;
  noonTime: string;
  noonLatDeg: number | string;
  noonLatMin: number | string;
  noonLatDir: 'N' | 'S';
  noonLonDeg: number | string;
  noonLonMin: number | string;
  noonLonDir: 'E' | 'W';
  noonCourse: number | string; 
  // Machinery
  engineUnits?: EngineUnitData[]; 
  auxEngines?: AuxEngineData[]; 
}

// Union type for all form data payloads
export type ReportFormData = 
  | DepartureSpecificData 
  | NoonFormData 
  | ArrivalFormData 
  | BerthFormData
  | ArrivalAnchorNoonFormData;

// Type for the response from GET /api/voyages/current/details
export interface CurrentVoyageDetails {
  vesselName?: string; // Added
  vesselImoNumber?: string; // Added
  vesselType?: string; // Added vessel type
  vesselDeadweight?: number | null; // Added
  voyageId: string;
  departurePort: string;
  destinationPort: string;
  voyageDistance?: number | null; // Added
  actualDepartureDate?: string | null; // Added
  actualDepartureTime?: string | null; // Added
  etaDate?: string | null; // Added
  etaTime?: string | null; // Added
  initialCargoStatus: CargoStatus; 
  totalDistanceTravelled?: number | null; // Added
  distanceToGo?: number | null; // Added
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
  faspLatDeg: number | null;
  faspLatMin: number | null;
  faspLatDir: 'N' | 'S' | null;
  faspLonDeg: number | null;
  faspLonMin: number | null;
  faspLonDir: 'E' | 'W' | null;
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
  mePresentRpm: number | null; // Added Present RPM
  meCurrentSpeed: number | null; // Added Current Speed
  // Calculated Performance Metrics
  sailingTimeVoyage?: number | null;
  avgSpeedVoyage?: number | null;
  // Noon Report Specific Fields
  passageState: PassageState | null; // Keep PassageState as is
  noonDate: string | null;
  noonTime: string | null;
  noonLatDeg: number | null;
  noonLatMin: number | null;
  noonLatDir: 'N' | 'S' | null;
  noonLonDeg: number | null;
  noonLonMin: number | null;
  noonLonDir: 'E' | 'W' | null;
  // noonCourse is already in FullReportViewDTO extension
  sospDate: string | null;
  sospTime: string | null;
  sospLatDeg: number | null;
  sospLatMin: number | null;
  sospLatDir: 'N' | 'S' | null;
  sospLonDeg: number | null;
  sospLonMin: number | null;
  sospLonDir: 'E' | 'W' | null;
  // sospCourse is already in FullReportViewDTO extension
  rospDate: string | null;
  rospTime: string | null;
  rospLatDeg: number | null;
  rospLatMin: number | null;
  rospLatDir: 'N' | 'S' | null;
  rospLonDeg: number | null;
  rospLonMin: number | null;
  rospLonDir: 'E' | 'W' | null;
  // rospCourse is already in FullReportViewDTO extension
  eospDate: string | null;
  eospTime: string | null;
  eospLatDeg: number | null;
  eospLatMin: number | null;
  eospLatDir: 'N' | 'S' | null;
  eospLonDeg: number | null;
  eospLonMin: number | null;
  eospLonDir: 'E' | 'W' | null;
  eospCourse: number | null;
  estimatedBerthingDate: string | null;
  estimatedBerthingTime: string | null;
  berthDate: string | null;
  berthTime: string | null;
  berthLatDeg: number | null;
  berthLatMin: number | null;
  berthLatDir: 'N' | 'S' | null;
  berthLonDeg: number | null;
  berthLonMin: number | null;
  berthLonDir: 'E' | 'W' | null;
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
  noonCourse?: number | null; 
  sospCourse?: number | null; // Added sospCourse
  rospCourse?: number | null; // Added rospCourse
  // Add calculated performance metrics to the view DTO as well
  sailingTimeVoyage?: number | null;
  avgSpeedVoyage?: number | null;
  berthNumber?: string | null; // Added Berth Number
  // Fields for modification workflow (from backend DTO)
  modification_checklist?: string[] | null;
  requested_changes_comment?: string | null;
}
