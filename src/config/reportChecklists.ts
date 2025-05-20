import { ReportType } from '../types/report';

export interface ChecklistItem {
  id: string;
  label: string;
  fields_affected: string[]; // These should correspond to keys in ReportRecordData or specific form data types
  reportType: ReportType;
  category?: string; // Optional: e.g., "Voyage", "Bunker", "Weather", "Machinery"
}

export const departureChecklistItems: ChecklistItem[] = [
  // Voyage Details
  { 
    id: 'departure_voyage_ports', 
    label: 'Voyage Ports (Departure/Destination)', 
    fields_affected: ['departurePort', 'destinationPort'], 
    reportType: 'departure',
    category: 'Voyage' 
  },
  { 
    id: 'departure_voyage_distance_eta', 
    label: 'Voyage Distance & ETA', 
    fields_affected: ['voyageDistance', 'etaDate', 'etaTime'], 
    reportType: 'departure',
    category: 'Voyage'
  },
  // Draft & Cargo
  { 
    id: 'departure_drafts', 
    label: 'Drafts (Fwd/Aft)', 
    fields_affected: ['fwdDraft', 'aftDraft'], 
    reportType: 'departure',
    category: 'Cargo' 
  },
  { 
    id: 'departure_cargo_details', 
    label: 'Cargo Details (Quantity, Type, Status)', 
    fields_affected: ['cargoQuantity', 'cargoType', 'cargoStatus'], 
    reportType: 'departure',
    category: 'Cargo'
  },
  // FASP
  { 
    id: 'departure_fasp_datetime', 
    label: 'FASP Date & Time', 
    fields_affected: ['faspDate', 'faspTime'], 
    reportType: 'departure',
    category: 'FASP'
  },
  { 
    id: 'departure_fasp_coords', 
    label: 'FASP Coordinates', 
    fields_affected: ['faspLatDeg', 'faspLatMin', 'faspLatDir', 'faspLonDeg', 'faspLonMin', 'faspLonDir'], 
    reportType: 'departure',
    category: 'FASP'
  },
  { 
    id: 'departure_fasp_course', 
    label: 'FASP Course', 
    fields_affected: ['faspCourse'], 
    reportType: 'departure',
    category: 'FASP'
  },
  // Distance (Harbour)
  { 
    id: 'departure_harbour_distance_time', 
    label: 'Harbour Distance & Time', 
    fields_affected: ['harbourDistance', 'harbourTime'], 
    reportType: 'departure',
    category: 'Distance'
  },
  // Weather
  { 
    id: 'departure_weather_wind', 
    label: 'Weather - Wind (Direction/Force)', 
    fields_affected: ['windDirection', 'windForce'], 
    reportType: 'departure',
    category: 'Weather'
  },
  { 
    id: 'departure_weather_sea', 
    label: 'Weather - Sea (Direction/State)', 
    fields_affected: ['seaDirection', 'seaState'], 
    reportType: 'departure',
    category: 'Weather'
  },
  { 
    id: 'departure_weather_swell', 
    label: 'Weather - Swell (Direction/Height)', 
    fields_affected: ['swellDirection', 'swellHeight'], 
    reportType: 'departure',
    category: 'Weather'
  },
  // Bunker Consumptions
  { 
    id: 'departure_bunker_me_cons', 
    label: 'Bunker - ME Consumptions (All)', 
    fields_affected: ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil'], 
    reportType: 'departure',
    category: 'Bunker Consumptions'
  },
  { 
    id: 'departure_bunker_boiler_cons', 
    label: 'Bunker - Boiler Consumptions', 
    fields_affected: ['boilerConsumptionLsifo', 'boilerConsumptionLsmgo'], 
    reportType: 'departure',
    category: 'Bunker Consumptions'
  },
  { 
    id: 'departure_bunker_aux_cons', 
    label: 'Bunker - Aux Consumptions', 
    fields_affected: ['auxConsumptionLsifo', 'auxConsumptionLsmgo'], 
    reportType: 'departure',
    category: 'Bunker Consumptions'
  },
  // Bunker Supplies
  { 
    id: 'departure_bunker_supplies', 
    label: 'Bunker - Supplies (All Types)', 
    fields_affected: ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'], 
    reportType: 'departure',
    category: 'Bunker Supplies'
  },
  // Initial ROBs (only if applicable for first departure)
  { 
    id: 'departure_initial_robs', 
    label: 'Initial ROBs (All Types)', 
    fields_affected: ['initialRobLsifo', 'initialRobLsmgo', 'initialRobCylOil', 'initialRobMeOil', 'initialRobAeOil'], 
    reportType: 'departure',
    category: 'Initial ROBs'
  },
  // Machinery ME Params
  {
    id: 'departure_machinery_me_press_temp',
    label: 'Machinery - ME Pressures & Temperatures',
    fields_affected: ['meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp', 'meThrustBearingTemp'],
    reportType: 'departure',
    category: 'Machinery ME'
  },
  {
    id: 'departure_machinery_me_tc',
    label: 'Machinery - ME Turbocharger Params',
    fields_affected: ['meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut'],
    reportType: 'departure',
    category: 'Machinery ME'
  },
  {
    id: 'departure_machinery_me_run_perf',
    label: 'Machinery - ME Running Hours & Performance',
    fields_affected: ['meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed'],
    reportType: 'departure',
    category: 'Machinery ME'
  },
  // Machinery Engine Units
  {
    id: 'departure_machinery_engine_units',
    label: 'Machinery - Engine Units Data',
    fields_affected: ['engineUnits'], // Special handling: refers to the whole array/section
    reportType: 'departure',
    category: 'Machinery Units'
  },
  // Machinery Aux Engines
  {
    id: 'departure_machinery_aux_engines',
    label: 'Machinery - Aux Engines Data',
    fields_affected: ['auxEngines'], // Special handling: refers to the whole array/section
    reportType: 'departure',
    category: 'Machinery Aux'
  },
];

export const noonChecklistItems: ChecklistItem[] = [
  // General Info
  {
    id: 'noon_general_info',
    label: 'Noon Report Date/Time/Zone',
    fields_affected: ['reportDate', 'reportTime', 'timeZone'],
    reportType: 'noon',
    category: 'General'
  },
  // Noon Position & Course
  {
    id: 'noon_position_course',
    label: 'Noon Position & Course',
    fields_affected: ['noonLatDeg', 'noonLatMin', 'noonLatDir', 'noonLonDeg', 'noonLonMin', 'noonLonDir', 'noonCourse'],
    reportType: 'noon',
    category: 'Navigation'
  },
  // Passage State
  {
    id: 'noon_passage_state',
    label: 'Passage State (Noon/SOSP/ROSP)',
    fields_affected: ['passageState'],
    reportType: 'noon',
    category: 'Navigation'
  },
  // SOSP Details (conditional on passageState)
  {
    id: 'noon_sosp_details',
    label: 'SOSP Details (Date, Time, Position, Course)',
    fields_affected: ['sospDate', 'sospTime', 'sospLatDeg', 'sospLatMin', 'sospLatDir', 'sospLonDeg', 'sospLonMin', 'sospLonDir', 'sospCourse'],
    reportType: 'noon',
    category: 'Navigation'
  },
  // ROSP Details (conditional on passageState)
  {
    id: 'noon_rosp_details',
    label: 'ROSP Details (Date, Time, Position, Course)',
    fields_affected: ['rospDate', 'rospTime', 'rospLatDeg', 'rospLatMin', 'rospLatDir', 'rospLonDeg', 'rospLonMin', 'rospLonDir', 'rospCourse'],
    reportType: 'noon',
    category: 'Navigation'
  },
  // Performance & Distance
  {
    id: 'noon_performance_distance',
    label: 'Performance - Distance Since Last Report',
    fields_affected: ['distanceSinceLastReport'],
    reportType: 'noon',
    category: 'Performance'
  },
  // Weather (same as departure)
  {
    id: 'noon_weather_wind',
    label: 'Weather - Wind (Direction/Force)',
    fields_affected: ['windDirection', 'windForce'],
    reportType: 'noon',
    category: 'Weather'
  },
  {
    id: 'noon_weather_sea',
    label: 'Weather - Sea (Direction/State)',
    fields_affected: ['seaDirection', 'seaState'],
    reportType: 'noon',
    category: 'Weather'
  },
  {
    id: 'noon_weather_swell',
    label: 'Weather - Swell (Direction/Height)',
    fields_affected: ['swellDirection', 'swellHeight'],
    reportType: 'noon',
    category: 'Weather'
  },
  // Bunker Consumptions (same as departure)
  {
    id: 'noon_bunker_me_cons',
    label: 'Bunker - ME Consumptions',
    fields_affected: ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil'],
    reportType: 'noon',
    category: 'Bunker Consumptions'
  },
  {
    id: 'noon_bunker_boiler_cons',
    label: 'Bunker - Boiler Consumptions',
    fields_affected: ['boilerConsumptionLsifo', 'boilerConsumptionLsmgo'],
    reportType: 'noon',
    category: 'Bunker Consumptions'
  },
  {
    id: 'noon_bunker_aux_cons',
    label: 'Bunker - Aux Consumptions',
    fields_affected: ['auxConsumptionLsifo', 'auxConsumptionLsmgo'],
    reportType: 'noon',
    category: 'Bunker Consumptions'
  },
  // Bunker Supplies (same as departure)
  {
    id: 'noon_bunker_supplies',
    label: 'Bunker - Supplies (All Types)',
    fields_affected: ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'],
    reportType: 'noon',
    category: 'Bunker Supplies'
  },
  // Machinery ME Params (same as departure)
  {
    id: 'noon_machinery_me_press_temp',
    label: 'Machinery - ME Pressures & Temperatures',
    fields_affected: ['meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp', 'meThrustBearingTemp'],
    reportType: 'noon',
    category: 'Machinery ME'
  },
  {
    id: 'noon_machinery_me_tc',
    label: 'Machinery - ME Turbocharger Params',
    fields_affected: ['meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut'],
    reportType: 'noon',
    category: 'Machinery ME'
  },
  {
    id: 'noon_machinery_me_run_perf',
    label: 'Machinery - ME Running Hours & Performance',
    fields_affected: ['meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed'],
    reportType: 'noon',
    category: 'Machinery ME'
  },
  // Machinery Engine Units (same as departure)
  {
    id: 'noon_machinery_engine_units',
    label: 'Machinery - Engine Units Data',
    fields_affected: ['engineUnits'],
    reportType: 'noon',
    category: 'Machinery Units'
  },
  // Machinery Aux Engines (same as departure)
  {
    id: 'noon_machinery_aux_engines',
    label: 'Machinery - Aux Engines Data',
    fields_affected: ['auxEngines'],
    reportType: 'noon',
    category: 'Machinery Aux'
  },
];

export const arrivalChecklistItems: ChecklistItem[] = [
  {
    id: 'arrival_general_info',
    label: 'General Report Information',
    fields_affected: ['reportDate', 'reportTime', 'timeZone'],
    reportType: 'arrival',
    category: 'General'
  },
  {
    id: 'arrival_eosp_details',
    label: 'End of Sea Passage (EOSP) Details',
    fields_affected: [
      'eospDate', 'eospTime', 'eospLatDeg', 'eospLatMin', 'eospLatDir',
      'eospLonDeg', 'eospLonMin', 'eospLonDir', 'eospCourse'
    ],
    reportType: 'arrival',
    category: 'EOSP'
  },
  {
    id: 'arrival_weather_wind',
    label: 'Weather - Wind (Direction/Force)',
    fields_affected: ['windDirection', 'windForce'],
    reportType: 'arrival',
    category: 'Weather'
  },
  {
    id: 'arrival_weather_sea',
    label: 'Weather - Sea (Direction/State)',
    fields_affected: ['seaDirection', 'seaState'],
    reportType: 'arrival',
    category: 'Weather'
  },
  {
    id: 'arrival_weather_swell',
    label: 'Weather - Swell (Direction/Height)',
    fields_affected: ['swellDirection', 'swellHeight'],
    reportType: 'arrival',
    category: 'Weather'
  },
  {
    id: 'arrival_bunker_me_cons',
    label: 'Main Engine Bunker Consumption',
    fields_affected: [
      'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil',
      'meConsumptionMeOil', 'meConsumptionAeOil'
    ],
    reportType: 'arrival',
    category: 'Bunker Consumptions'
  },
  {
    id: 'arrival_bunker_boiler_cons',
    label: 'Boiler Bunker Consumption',
    fields_affected: ['boilerConsumptionLsifo', 'boilerConsumptionLsmgo'],
    reportType: 'arrival',
    category: 'Bunker Consumptions'
  },
  {
    id: 'arrival_bunker_aux_cons',
    label: 'Auxiliary Engines Bunker Consumption',
    fields_affected: ['auxConsumptionLsifo', 'auxConsumptionLsmgo'],
    reportType: 'arrival',
    category: 'Bunker Consumptions'
  },
  {
    id: 'arrival_bunker_supplies',
    label: 'Bunker Supplies',
    fields_affected: [
      'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'
    ],
    reportType: 'arrival',
    category: 'Bunker Supplies'
  },
  {
    id: 'arrival_machinery_me_press_temp',
    label: 'Machinery - ME Pressures & Temperatures',
    fields_affected: ['meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp', 'meThrustBearingTemp'],
    reportType: 'arrival',
    category: 'Machinery ME'
  },
  {
    id: 'arrival_machinery_me_tc',
    label: 'Machinery - ME Turbocharger Params',
    fields_affected: ['meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut'],
    reportType: 'arrival',
    category: 'Machinery ME'
  },
  {
    id: 'arrival_machinery_me_run_perf',
    label: 'Machinery - ME Running Hours & Performance',
    fields_affected: ['meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed'],
    reportType: 'arrival',
    category: 'Machinery ME'
  },
  {
    id: 'arrival_machinery_engine_units',
    label: 'Engine Units',
    fields_affected: ['engineUnits'],
    reportType: 'arrival',
    category: 'Machinery Units'
  },
  {
    id: 'arrival_machinery_aux_engines',
    label: 'Auxiliary Engines',
    fields_affected: ['auxEngines'],
    reportType: 'arrival',
    category: 'Machinery Aux'
  },
  {
    id: 'arrival_performance_distance',
    label: 'Distance Since Last Report',
    fields_affected: ['distanceSinceLastReport'],
    reportType: 'arrival',
    category: 'Performance'
  },
  {
    id: 'arrival_berth_details',
    label: 'Estimated Berthing Details',
    fields_affected: ['estimatedBerthingDate', 'estimatedBerthingTime'],
    reportType: 'arrival',
    category: 'Berth'
  }
];

export const arrivalAnchorNoonChecklistItems: ChecklistItem[] = [
  // General Info (from BaseReportData)
  {
    id: 'arrival_anchor_noon_general_info',
    label: 'General Report Information',
    fields_affected: ['reportDate', 'reportTime', 'timeZone'],
    reportType: 'arrival_anchor_noon',
    category: 'General'
  },
  // Noon Position & Course (from ArrivalAnchorNoonSpecificData)
  {
    id: 'arrival_anchor_noon_position_details',
    label: 'Noon Position & Course Details',
    fields_affected: [
      'noonDate', 'noonTime',
      'noonLatDeg', 'noonLatMin', 'noonLatDir',
      'noonLonDeg', 'noonLonMin', 'noonLonDir',
      'noonCourse'
    ],
    reportType: 'arrival_anchor_noon',
    category: 'Navigation'
  },
  // Performance & Distance (from ArrivalAnchorNoonSpecificData)
  {
    id: 'arrival_anchor_noon_performance_distance',
    label: 'Distance Since Last Report',
    fields_affected: ['distanceSinceLastReport'],
    reportType: 'arrival_anchor_noon',
    category: 'Performance'
  },
  // Weather (from BaseReportData - granular)
  {
    id: 'arrival_anchor_noon_weather_wind',
    label: 'Weather - Wind',
    fields_affected: ['windDirection', 'windForce'],
    reportType: 'arrival_anchor_noon',
    category: 'Weather'
  },
  {
    id: 'arrival_anchor_noon_weather_sea',
    label: 'Weather - Sea',
    fields_affected: ['seaDirection', 'seaState'],
    reportType: 'arrival_anchor_noon',
    category: 'Weather'
  },
  {
    id: 'arrival_anchor_noon_weather_swell',
    label: 'Weather - Swell',
    fields_affected: ['swellDirection', 'swellHeight'],
    reportType: 'arrival_anchor_noon',
    category: 'Weather'
  },
  // Bunker Consumptions (from BaseReportData - granular)
  {
    id: 'arrival_anchor_noon_bunker_me_cons',
    label: 'Bunker - ME Consumptions',
    fields_affected: ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil'],
    reportType: 'arrival_anchor_noon',
    category: 'Bunker Consumptions'
  },
  {
    id: 'arrival_anchor_noon_bunker_boiler_cons',
    label: 'Bunker - Boiler Consumptions',
    fields_affected: ['boilerConsumptionLsifo', 'boilerConsumptionLsmgo'],
    reportType: 'arrival_anchor_noon',
    category: 'Bunker Consumptions'
  },
  {
    id: 'arrival_anchor_noon_bunker_aux_cons',
    label: 'Bunker - Aux Consumptions',
    fields_affected: ['auxConsumptionLsifo', 'auxConsumptionLsmgo'],
    reportType: 'arrival_anchor_noon',
    category: 'Bunker Consumptions'
  },
  // Bunker Supplies (from BaseReportData)
  {
    id: 'arrival_anchor_noon_bunker_supplies',
    label: 'Bunker - Supplies',
    fields_affected: ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'],
    reportType: 'arrival_anchor_noon',
    category: 'Bunker Supplies'
  },
  // Machinery ME Params (from BaseReportData - granular)
  {
    id: 'arrival_anchor_noon_machinery_me_press_temp',
    label: 'Machinery - ME Pressures & Temperatures',
    fields_affected: ['meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp', 'meThrustBearingTemp'],
    reportType: 'arrival_anchor_noon',
    category: 'Machinery ME'
  },
  {
    id: 'arrival_anchor_noon_machinery_me_tc',
    label: 'Machinery - ME Turbocharger Params',
    fields_affected: ['meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut'],
    reportType: 'arrival_anchor_noon',
    category: 'Machinery ME'
  },
  {
    id: 'arrival_anchor_noon_machinery_me_run_perf',
    label: 'Machinery - ME Running Hours & Performance',
    fields_affected: ['meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed'],
    reportType: 'arrival_anchor_noon',
    category: 'Machinery ME'
  },
  // Machinery Engine Units (from BaseReportData)
  {
    id: 'arrival_anchor_noon_machinery_engine_units',
    label: 'Machinery - Engine Units Data',
    fields_affected: ['engineUnits'],
    reportType: 'arrival_anchor_noon',
    category: 'Machinery Units'
  },
  // Machinery Aux Engines (from BaseReportData)
  {
    id: 'arrival_anchor_noon_machinery_aux_engines',
    label: 'Machinery - Aux Engines Data',
    fields_affected: ['auxEngines'],
    reportType: 'arrival_anchor_noon',
    category: 'Machinery Aux'
  }
];

export const CHECKLIST_ITEMS_BY_REPORT_TYPE: Record<ReportType, ChecklistItem[]> = {
  'departure': departureChecklistItems,
  'noon': noonChecklistItems,
  'arrival': arrivalChecklistItems,
  'berth': [], // Placeholder for berth checklist items
  'arrival_anchor_noon': arrivalAnchorNoonChecklistItems,
};

// Example: How to get checklist for a specific report type
export function getChecklistForReportType(reportType: ReportType): ChecklistItem[] {
  return CHECKLIST_ITEMS_BY_REPORT_TYPE[reportType] || [];
}