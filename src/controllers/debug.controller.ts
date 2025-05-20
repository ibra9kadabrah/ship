// src/controllers/debug.controller.ts
import { Request, Response } from 'express';
import db from '../db/connection';
import debugUtils from './debug-utils';

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
  }
};

export default DebugController;