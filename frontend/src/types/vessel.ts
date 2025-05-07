// Frontend-specific vessel types

// Simplified Vessel type for frontend display/logic in forms
export interface VesselInfo {
  id: string;
  name: string;
  imoNumber: string;
  deadweight: number; // Added deadweight
  // Include initial ROB fields to check if they are set
  initialRobLsifo?: number | null;
  initialRobLsmgo?: number | null;
  initialRobCylOil?: number | null;
  initialRobMeOil?: number | null;
  initialRobAeOil?: number | null;
  // Add field to carry over destination from previous voyage
  lastDestinationPort?: string | null; 
  // Add field for previous noon state logic
  previousNoonPassageState?: 'SOSP' | 'ROSP' | null; 
  // Add other fields if needed for display
}

// Add other frontend-specific vessel types here if needed later
