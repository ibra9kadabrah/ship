import { v4 as uuidv4 } from 'uuid';
import { PoolClient } from 'pg';
import pool from '../db/connection';
import { EngineUnitData } from '../types/report';

// Type for input data when creating multiple units
type CreateEngineUnitInput = Omit<EngineUnitData, 'id' | 'reportId'>;

export const ReportEngineUnitModel = {
  // Create multiple engine unit records for a single report within a transaction
  async createMany(reportId: string, unitsData: CreateEngineUnitInput[], client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    const isExternalTransaction = !(client === pool);
    const dbClient = isExternalTransaction ? client : await pool.connect();

    try {
      if (!isExternalTransaction) await (dbClient as PoolClient).query('BEGIN');
      
      const sql = `
        INSERT INTO report_engine_units (
          id, reportId, unitNumber, exhaustTemp, underPistonAir,
          pcoOutletTemp, jcfwOutletTemp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      for (const unit of unitsData) {
        await dbClient.query(sql, [
          uuidv4(),
          reportId,
          unit.unitNumber,
          unit.exhaustTemp ?? null,
          unit.underPistonAir ?? null,
          unit.pcoOutletTemp ?? null,
          unit.jcfwOutletTemp ?? null,
        ]);
      }
      
      if (!isExternalTransaction) await (dbClient as PoolClient).query('COMMIT');
      return true;
    } catch (error) {
      if (!isExternalTransaction) await (dbClient as PoolClient).query('ROLLBACK');
      console.error(`Error creating engine units for report ${reportId}:`, error);
      return false;
    } finally {
      if (!isExternalTransaction) (dbClient as PoolClient).release();
    }
  },

  // Find all engine unit records for a specific report
  async findByReportId(reportId: string, client: PoolClient | import('pg').Pool = pool): Promise<EngineUnitData[]> {
    const res = await client.query(
      `SELECT * FROM report_engine_units 
       WHERE reportId = $1 
       ORDER BY unitNumber ASC`,
      [reportId]
    );
    return res.rows as EngineUnitData[];
  },

  // Delete all engine unit records for a specific report
  async deleteByReportId(reportId: string, client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    try {
      await client.query('DELETE FROM report_engine_units WHERE reportId = $1', [reportId]);
      return true;
    } catch (error) {
      console.error(`Error deleting engine units for report ${reportId}:`, error);
      return false;
    }
  },
};

export default ReportEngineUnitModel;
