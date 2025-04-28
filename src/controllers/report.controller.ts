// src/controllers/report.controller.ts
import { Request, Response } from 'express';
import { ReportService } from '../services/report.service'; // Import the service
import { CreateReportDTO, ReviewReportDTO, ReportType } from '../types/report'; // Use new DTO union

// Define possible report types for runtime validation
const VALID_REPORT_TYPES: ReportType[] = ['departure', 'noon', 'arrival', 'berth']; // Ensure berth is included

export const ReportController = {
  // Unified endpoint for submitting any report type (captain only)
  // Note: Route needs to be updated to handle different types, e.g., POST /api/reports
  async submitReport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      if (req.user.role !== 'captain') {
         res.status(403).json({ error: 'Only captains can submit reports' });
         return;
      }
      
      // TODO: Add more robust validation (e.g., using a library like Zod)
      const reportData: CreateReportDTO = req.body; 
      const captainId = req.user.id;

      // Basic validation moved here or could be in service
      // Use the runtime constant array for validation
      if (!reportData.reportType || !VALID_REPORT_TYPES.includes(reportData.reportType)) {
         res.status(400).json({ error: `Valid reportType (${VALID_REPORT_TYPES.join(', ')}) is required` });
         return;
      }
       // Add checks for required fields based on reportType if needed before calling service

      const newReport = await ReportService.submitReport(reportData, captainId);
      res.status(201).json(newReport);

    } catch (error: any) { 
      console.error('Error submitting report:', error);
      // Handle specific errors thrown by the service
      if (error.message.includes("not found")) {
         res.status(404).json({ error: error.message });
      } else if (error.message.includes("required for the first report")) {
         res.status(400).json({ error: error.message });
      } else if (error.message.includes("pending reports")) { // Example check
         res.status(400).json({ error: error.message });
      }
      else {
         res.status(500).json({ error: 'Failed to submit report' });
      }
    }
  },
  
  // Get pending reports (admin/office only)
  async getPendingReports(req: Request, res: Response): Promise<void> {
    try {
      // Authorization check could also be middleware
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'office')) {
         res.status(403).json({ error: 'Admin or office access required' });
         return;
      }
      const reports = await ReportService.getPendingReports();
      res.status(200).json(reports);
    } catch (error: any) {
      console.error('Error fetching pending reports:', error);
      res.status(500).json({ error: 'Failed to fetch pending reports' });
    }
  },

  // Get report by ID (admin/office only)
  async getReportById(req: Request, res: Response): Promise<void> {
    try {
       // Authorization check
       if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'office')) {
         res.status(403).json({ error: 'Admin or office access required' });
         return;
       }
      const { id } = req.params;
      const report = await ReportService.getReportById(id);
      res.status(200).json(report);
    } catch (error: any) {
        console.error('Error fetching report:', error);
        if (error.message.includes("not found")) {
           res.status(404).json({ error: error.message });
        } else {
           res.status(500).json({ error: 'Failed to fetch report' });
        }
    }
  },
  
  // Review report (approve/reject) (admin/office only)
  async reviewReport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'office')) {
         res.status(403).json({ error: 'Admin or office access required' });
         return;
      }
      
      const { id } = req.params;
      const reviewData: ReviewReportDTO = req.body;
      const reviewerId = req.user.id;

      // Basic validation
      if (!reviewData.status || (reviewData.status !== 'approved' && reviewData.status !== 'rejected')) {
          res.status(400).json({ error: "Invalid status provided. Must be 'approved' or 'rejected'." });
          return;
      }
      
      const updatedReport = await ReportService.reviewReport(id, reviewData, reviewerId);
      res.status(200).json(updatedReport);

    } catch (error: any) {
      console.error('Error reviewing report:', error);
       if (error.message.includes("not found")) {
           res.status(404).json({ error: error.message });
       } else if (error.message.includes("already been reviewed")) { // Example check
           res.status(400).json({ error: error.message });
       }
       else {
           res.status(500).json({ error: 'Failed to review report' });
       }
    }
  }
};

// Note: We might need to export ReportType if used directly in controller validation
// export { ReportType }; 
export default ReportController;
