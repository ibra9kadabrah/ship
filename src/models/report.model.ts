// src/models/report.model.ts
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { Report, CreateDepartureReportDTO, ReportType, ReportStatus, ReviewReportDTO } from '../types/report';
import VoyageModel from './voyage.model';
import VesselModel from './vessel.model';

export const ReportModel = {
  // Create a departure report (and a new voyage)
  createDepartureReport(reportData: CreateDepartureReportDTO, captainId: string): Report {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Create a new voyage
    const voyageData = {
      vesselId: reportData.vesselId,
      departurePort: reportData.departurePort,
      destinationPort: reportData.destinationPort,
      voyageDistance: reportData.voyageDistance,
      startDate: reportData.reportDate
    };
    
    const voyage = VoyageModel.create(voyageData);
    
    // Create the departure report
    const stmt = db.prepare(`
      INSERT INTO reports (
        id, voyageId, vesselId, reportType, status, captainId,
        reportDate, reportTime, timeZone,
        departurePort, destinationPort, voyageDistance, etaDate, etaTime,
        createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      voyage.id,
      reportData.vesselId,
      'departure' as ReportType,
      'pending' as ReportStatus,
      captainId,
      reportData.reportDate,
      reportData.reportTime,
      reportData.timeZone,
      reportData.departurePort,
      reportData.destinationPort,
      reportData.voyageDistance,
      reportData.etaDate,
      reportData.etaTime,
      now,
      now
    );
    
    return this.findById(id) as Report;
  },
  
  // Find report by ID
  findById(id: string): Report | null {
    const stmt = db.prepare('SELECT * FROM reports WHERE id = ?');
    const report = stmt.get(id) as Report | undefined;
    
    return report || null;
  },
  
  // Get pending reports
  getPendingReports(): Report[] {
    const stmt = db.prepare('SELECT * FROM reports WHERE status = ? ORDER BY createdAt DESC');
    return stmt.all('pending') as Report[];
  },
  
  // Review a report (approve or reject)
  reviewReport(id: string, reviewData: ReviewReportDTO, reviewerId: string): Report | null {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE reports
      SET status = ?, reviewerId = ?, reviewDate = ?, reviewComments = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      reviewData.status,
      reviewerId,
      now,
      reviewData.reviewComments || '',
      now,
      id
    );
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.findById(id);
  },
  
  // Check if captain has pending reports for a vessel
  hasPendingReports(captainId: string, vesselId: string): boolean {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM reports 
      WHERE captainId = ? AND vesselId = ? AND status = ?
    `);
    
    const result = stmt.get(captainId, vesselId, 'pending') as { count: number };
    return result.count > 0;
  },
  
  // Get most recent report for a voyage
  getLatestReportForVoyage(voyageId: string): Report | null {
    const stmt = db.prepare(`
      SELECT * FROM reports 
      WHERE voyageId = ? 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);
    
    const report = stmt.get(voyageId) as Report | undefined;
    return report || null;
  }
};

export default ReportModel;