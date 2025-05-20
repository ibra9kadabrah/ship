import { ReportType } from '../types/report'; // This import will need to be adjusted if ReportType is also frontend specific

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

// Example: How to get checklist for a specific report type
export function getChecklistForReportType(reportType: ReportType): ChecklistItem[] {
  switch (reportType) {
    case 'departure':
      return departureChecklistItems;
    // Add cases for 'noon', 'arrival', etc. as they are defined
    default:
      return [];
  }
}