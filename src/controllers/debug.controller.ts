// src/controllers/debug.controller.ts
import { Request, Response } from 'express';
import db from '../db/connection';
import debugUtils from './debug-utils';
import ReportModel from '../models/report.model'; // Added
import VoyageModel from '../models/voyage.model'; // Added
import { calculateDistances, DistanceCalculationInput } from '../services/distance_calculator'; // Added
import { ReportType } from '../types/report'; // Added

export const DebugController = {
  // Debug endpoint to check distance values directly from the database
  async checkDistanceValues(req: Request, res: Response): Promise<void> {
    try {
      // Query all noon reports to check their distanceSinceLastReport values
      const reports = db.prepare(`
        SELECT id, reportType, reportDate, distanceSinceLastReport
        FROM reports
        WHERE reportType = 'noon'
        ORDER BY reportDate DESC
      `).all();
      
      res.status(200).json({
        message: 'Distance values retrieved',
        count: reports.length,
        reports
      });
    } catch (error) {
      console.error('Error fetching distance values:', error);
      res.status(500).json({ error: 'Failed to fetch distance values' });
    }
  },

  // Debug endpoint to fix distance values in existing reports
  async fixDistanceValues(req: Request, res: Response): Promise<void> {
    try {
      // Call the utility function to update the reports
      const result = debugUtils.updateNoonReportDistances();
      
      if (result.success) {
        res.status(200).json({
          message: 'Distance values updated successfully',
          result
        });
      } else {
        res.status(500).json({
          error: 'Failed to update distance values',
          details: result.error
        });
      }
    } catch (error) {
      console.error('Error updating distance values:', error);
      res.status(500).json({ error: 'Failed to update distance values' });
    }
  },

  // Debug endpoint to check the table schema
  async checkTableSchema(req: Request, res: Response): Promise<void> {
    try {
      // Query the table info to see if the column exists
      const tableInfo = db.prepare(`PRAGMA table_info(reports)`).all();
      
      // Check if distanceSinceLastReport column exists
      const hasDistanceColumn = tableInfo.some((column: any) =>
        column.name === 'distanceSinceLastReport'
      );
      
      res.status(200).json({
        message: 'Table schema retrieved',
        hasDistanceColumn,
        schema: tableInfo
      });
    } catch (error) {
      console.error('Error checking table schema:', error);
      res.status(500).json({ error: 'Failed to check table schema' });
    }
  },

  async recalculateSingleReportDistances(req: Request, res: Response): Promise<void> {
    const { reportId } = req.params;
    if (!reportId) {
      res.status(400).json({ error: 'Report ID is required.' });
      return;
    }

    try {
      const reportToFix = ReportModel.findById(reportId);
      if (!reportToFix) {
        res.status(404).json({ error: `Report with ID ${reportId} not found.` });
        return;
      }

      if (!reportToFix.vesselId || !reportToFix.voyageId) {
        res.status(400).json({ error: `Report ${reportId} is missing vesselId or voyageId.` });
        return;
      }

      const previousReport = ReportModel.findPreviousReport(reportId, reportToFix.vesselId);
      const voyage = VoyageModel.findById(reportToFix.voyageId);

      if (!voyage) {
        res.status(404).json({ error: `Voyage with ID ${reportToFix.voyageId} not found for report ${reportId}.` });
        return;
      }

      const distanceInput: DistanceCalculationInput = {
        reportType: reportToFix.reportType as ReportType,
        harbourDistance: (reportToFix as any).harbourDistance ?? null,
        distanceSinceLastReport: (reportToFix as any).distanceSinceLastReport ?? null,
        previousReportData: previousReport,
        voyageDistance: voyage.voyageDistance,
      };

      const recalculatedDistances = calculateDistances(distanceInput);

      const updateSuccess = ReportModel.update(reportId, {
        totalDistanceTravelled: recalculatedDistances.totalDistanceTravelled,
        distanceToGo: recalculatedDistances.distanceToGo,
        // ReportModel.update will handle updatedAt automatically
      });

      if (updateSuccess) {
        const updatedReport = ReportModel.findById(reportId);
        res.status(200).json({
          message: `Distances recalculated for report ${reportId}.`,
          originalReport: reportToFix, // Show original for comparison if needed
          recalculatedDistances,
          updatedReportValues: {
            totalDistanceTravelled: updatedReport?.totalDistanceTravelled,
            distanceToGo: updatedReport?.distanceToGo,
          }
        });
      } else {
        res.status(500).json({ error: `Failed to update report ${reportId} with new distances.` });
      }
    } catch (error) {
      console.error(`Error recalculating distances for report ${reportId}:`, error);
      res.status(500).json({ error: `Failed to recalculate distances for report ${reportId}.` });
    }
  }
};

export default DebugController;