// src/controllers/report.controller.ts
import { Request, Response } from 'express';
import ReportModel from '../models/report.model';
import VesselModel from '../models/vessel.model';
import { CreateDepartureReportDTO, ReviewReportDTO } from '../types/report';

export const ReportController = {
  // Submit a departure report (captain only)
  submitDepartureReport(req: Request, res: Response): void {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const reportData: CreateDepartureReportDTO = req.body;
      const captainId = req.user.id;
      
      // Validate vessel exists
      const vessel = VesselModel.findById(reportData.vesselId);
      if (!vessel) {
        res.status(404).json({ error: 'Vessel not found' });
        return;
      }
      
      // Verify captain is assigned to this vessel
      if (vessel.captainId !== captainId) {
        res.status(403).json({ error: 'You are not assigned to this vessel' });
        return;
      }
      
      // Check if captain has pending reports for this vessel
      if (ReportModel.hasPendingReports(captainId, reportData.vesselId)) {
        res.status(400).json({ error: 'You have pending reports for this vessel. Wait for approval before submitting a new report.' });
        return;
      }
      
      // Create the departure report
      const report = ReportModel.createDepartureReport(reportData, captainId);
      
      res.status(201).json(report);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error submitting departure report:', error);
        res.status(500).json({ error: `Failed to submit departure report: ${error.message}` });
      } else {
        console.error('Unknown error submitting departure report:', error);
        res.status(500).json({ error: 'Failed to submit departure report: unknown error' });
      }
    }
  },
  
  // Get pending reports (admin/office only)
  getPendingReports(req: Request, res: Response): void {
    try {
      const reports = ReportModel.getPendingReports();
      res.status(200).json(reports);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error fetching pending reports:', error);
        res.status(500).json({ error: `Failed to fetch pending reports: ${error.message}` });
      } else {
        console.error('Unknown error fetching pending reports:', error);
        res.status(500).json({ error: 'Failed to fetch pending reports: unknown error' });
      }
    }
  },

  // Get report by ID
  getReportById(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const report = ReportModel.findById(id);
      
      if (!report) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      
      res.status(200).json(report);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: `Failed to fetch report: ${error.message}` });
      } else {
        console.error('Unknown error fetching report:', error);
        res.status(500).json({ error: 'Failed to fetch report: unknown error' });
      }
    }
  },
  
  // Review report (approve/reject) (admin/office only)
  reviewReport(req: Request, res: Response): void {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }
      
      const { id } = req.params;
      const reviewData: ReviewReportDTO = req.body;
      const reviewerId = req.user.id;
      
      // Validate report exists
      const existingReport = ReportModel.findById(id);
      if (!existingReport) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      
      // Check if report is already reviewed
      if (existingReport.status !== 'pending') {
        res.status(400).json({ error: 'Report has already been reviewed' });
        return;
      }
      
      // Update the report
      const updatedReport = ReportModel.reviewReport(id, reviewData, reviewerId);
      
      res.status(200).json(updatedReport);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error reviewing report:', error);
        res.status(500).json({ error: `Failed to review report: ${error.message}` });
      } else {
        console.error('Unknown error reviewing report:', error);
        res.status(500).json({ error: 'Failed to review report: unknown error' });
      }
    }
  }
};

export default ReportController;
