export interface Vessel {
    id: string;
    name: string;
    flag: string;
    imoNumber: string;
    deadweight: number;
    captainId: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
  }
  
  export interface CreateVesselDTO {
    name: string;
    flag: string;
    imoNumber: string;
    deadweight: number;
    captainId: string;
  }
  
  export interface UpdateVesselDTO {
    name?: string;
    flag?: string;
    imoNumber?: string;
    deadweight?: number;
    captainId?: string;
    isActive?: boolean;
  }