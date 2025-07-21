export interface Vessel {
    id: string;
    name: string;
    flag: string;
    imoNumber: string;
    type: string; // Added vessel type
    deadweight: number;
    captainId: string;
    // Initial ROBs
    initialRobLsifo?: number | null;
    initialRobLsmgo?: number | null;
    initialRobCylOil?: number | null;
    initialRobMeOil?: number | null;
    initialRobAeOil?: number | null;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    // Add field to carry over destination from previous voyage
    lastDestinationPort?: string | null; 
  }
  
  export interface CreateVesselDTO {
    name: string;
    flag: string;
    imoNumber: string;
    type: string; // Added vessel type
    deadweight: number;
    captainId: string;
  }
  
  export interface UpdateVesselDTO {
    name?: string;
    flag?: string;
    imoNumber?: string;
    type?: string; // Added vessel type
    deadweight?: number;
    captainId?: string;
    isActive?: boolean;
  }
