import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { AuxEngineData } from '../types/report';

// Type for input data when creating multiple aux engines
type CreateAuxEngineInput = Omit<AuxEngineData, 'id' | 'reportId'>;

export const ReportAuxEngineModel = {
  // Create multiple aux engine records for a single report within a transaction
  createMany(reportId: string, enginesData: CreateAuxEngineInput[]): boolean {
    const insertStmt = db.prepare(`
      INSERT INTO report_aux_engines (
        id, reportId, engineName, load, kw, foPress, 
        lubOilPress, waterTemp, dailyRunHour, createdAt, updatedAt
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((engines) => {
      const now = new Date().toISOString();
      for (const engine of engines) {
        insertStmt.run(
          uuidv4(),
          reportId,
          engine.engineName,
          engine.load ?? null,
          engine.kw ?? null,
          engine.foPress ?? null,
          engine.lubOilPress ?? null,
          engine.waterTemp ?? null,
          engine.dailyRunHour ?? null,
          now,
          now
        );
      }
    });

    try {
      insertMany(enginesData);
      return true;
    } catch (error) {
      console.error(`Error creating aux engines for report ${reportId}:`, error);
      return false; // Transaction automatically rolls back
    }
  },

  // Find all aux engine records for a specific report
  findByReportId(reportId: string): AuxEngineData[] {
    const stmt = db.prepare(`
      SELECT * FROM report_aux_engines 
      WHERE reportId = ? 
      ORDER BY engineName ASC
    `);
    return stmt.all(reportId) as AuxEngineData[];
  },
};

export default ReportAuxEngineModel;
