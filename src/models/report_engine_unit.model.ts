import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { EngineUnitData } from '../types/report';

// Type for input data when creating multiple units
type CreateEngineUnitInput = Omit<EngineUnitData, 'id' | 'reportId'>;

export const ReportEngineUnitModel = {
  // Create multiple engine unit records for a single report within a transaction
  createMany(reportId: string, unitsData: CreateEngineUnitInput[]): boolean {
    const insertStmt = db.prepare(`
      INSERT INTO report_engine_units (
        id, reportId, unitNumber, exhaustTemp, underPistonAir, 
        pcoOutletTemp, jcfwOutletTemp, createdAt, updatedAt
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((units) => {
      const now = new Date().toISOString();
      for (const unit of units) {
        insertStmt.run(
          uuidv4(),
          reportId,
          unit.unitNumber,
          unit.exhaustTemp ?? null,
          unit.underPistonAir ?? null,
          unit.pcoOutletTemp ?? null,
          unit.jcfwOutletTemp ?? null,
          now,
          now
        );
      }
    });

    try {
      insertMany(unitsData);
      return true;
    } catch (error) {
      console.error(`Error creating engine units for report ${reportId}:`, error);
      return false; // Transaction automatically rolls back
    }
  },

  // Find all engine unit records for a specific report
  findByReportId(reportId: string): EngineUnitData[] {
    const stmt = db.prepare(`
      SELECT * FROM report_engine_units 
      WHERE reportId = ? 
      ORDER BY unitNumber ASC
    `);
    return stmt.all(reportId) as EngineUnitData[];
  },

  // Delete all engine unit records for a specific report
  deleteByReportId(reportId: string): boolean {
    const stmt = db.prepare('DELETE FROM report_engine_units WHERE reportId = ?');
    try {
      stmt.run(reportId);
      return true;
    } catch (error) {
      console.error(`Error deleting engine units for report ${reportId}:`, error);
      return false;
    }
  },
};

export default ReportEngineUnitModel;
