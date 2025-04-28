// voyage.ts
export type VoyageStatus = 'active' | 'completed';

export interface Voyage {
  id: string;
  vesselId: string;
  voyageNumber: string;
  departurePort: string; // Added based on DB schema
  destinationPort: string; // Added based on DB schema
  voyageDistance: number; // Added based on DB schema
  startDate: string;
  endDate?: string;
  status: VoyageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoyageDTO {
    vesselId: string;
    departurePort: string;  
    destinationPort: string;  
    voyageDistance: number;   
    startDate: string;
  }
