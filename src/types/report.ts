// src/types/report.ts
export type ReportType = 'departure' | 'noon' | 'arrival' | 'berth';
export type ReportStatus = 'pending' | 'approved' | 'rejected';

export interface Report {
  id: string;
  voyageId: string;
  vesselId: string;
  reportType: ReportType;
  status: ReportStatus;
  captainId: string;
  reviewerId?: string;
  reviewDate?: string;
  reviewComments?: string;
  
  // General information
  reportDate: string;
  reportTime: string;
  timeZone: string;
  
  // Voyage data
  departurePort?: string;
  destinationPort?: string;
  voyageDistance?: number;
  etaDate?: string;
  etaTime?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartureReportDTO {
  vesselId: string;
  reportDate: string;
  reportTime: string;
  timeZone: string;
  departurePort: string;
  destinationPort: string;
  voyageDistance: number;
  etaDate: string;
  etaTime: string;
}

export interface ReviewReportDTO {
  status: 'approved' | 'rejected';
  reviewComments?: string;
}