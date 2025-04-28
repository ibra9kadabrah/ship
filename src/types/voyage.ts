// voyage.ts
export type VoyageStatus = 'active' | 'completed';

export interface Voyage {
  id: string;
  vesselId: string;
  voyageNumber: string;
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