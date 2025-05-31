// voyage.ts
import { CargoStatus } from './report'; // Import CargoStatus

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

export interface VoyageWithCargo extends Voyage {
  lastCargoQuantity?: number;
  lastCargoType?: string | null;
  lastCargoStatus?: CargoStatus | null;
}

export interface CreateVoyageDTO {
    vesselId: string;
    departurePort: string;
    destinationPort: string;
    voyageDistance: number;
    startDate: string;
  }

// Represents the logical state of the voyage based on the latest report
export type VoyageState =
  | 'NO_VOYAGE_ACTIVE' // Ready for Departure
  | 'DEPARTED'         // After Departure, before first Noon/Arrival
  | 'AT_SEA'           // After first Noon, before Arrival
  | 'ARRIVED'          // After Arrival, before first Berth
  | 'AT_ANCHOR'        // After Arrival Anchor Noon, before Berth or new Departure
  | 'BERTHED'          // After first Berth, before next Departure
  | 'REPORT_PENDING';  // If the latest report is pending review
