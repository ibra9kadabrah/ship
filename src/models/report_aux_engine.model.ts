import { v4 as uuidv4 } from 'uuid';
import { PoolClient } from 'pg';
import pool from '../db/connection';
import { AuxEngineData } from '../types/report';

// Type for input data when creating multiple aux engines
type CreateAuxEngineInput = Omit<AuxEngineData, 'id' | 'reportId'>;

export const ReportAuxEngineModel = {
  // Create multiple aux engine records for a single report within a transaction
  async createMany(reportId: string, enginesData: CreateAuxEngineInput[], client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    const isExternalTransaction = !(client === pool);
    const dbClient = isExternalTransaction ? client : await pool.connect();

    try {
      if (!isExternalTransaction) await (dbClient as PoolClient).query('BEGIN');
      
      const sql = `
        INSERT INTO report_aux_engines (
          id, reportId, engineName, load, kw, foPress,
          lubOilPress, waterTemp, dailyRunHour
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      for (const engine of enginesData) {
        await dbClient.query(sql, [
          uuidv4(),
          reportId,
          engine.engineName,
          engine.load ?? null,
          engine.kw ?? null,
          engine.foPress ?? null,
          engine.lubOilPress ?? null,
          engine.waterTemp ?? null,
          engine.dailyRunHour ?? null,
        ]);
      }
      
      if (!isExternalTransaction) await (dbClient as PoolClient).query('COMMIT');
      return true;
    } catch (error) {
      if (!isExternalTransaction) await (dbClient as PoolClient).query('ROLLBACK');
      console.error(`Error creating aux engines for report ${reportId}:`, error);
      return false;
    } finally {
      if (!isExternalTransaction) (dbClient as PoolClient).release();
    }
  },

  // Find all aux engine records for a specific report
  async findByReportId(reportId: string, client: PoolClient | import('pg').Pool = pool): Promise<AuxEngineData[]> {
    const res = await client.query(
      `SELECT * FROM report_aux_engines 
       WHERE reportId = $1 
       ORDER BY engineName ASC`,
      [reportId]
    );
    return res.rows as AuxEngineData[];
  },

  // Delete all aux engine records for a specific report
  async deleteByReportId(reportId: string, client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    try {
      await client.query('DELETE FROM report_aux_engines WHERE reportId = $1', [reportId]);
      return true;
    } catch (error) {
      console.error(`Error deleting aux engines for report ${reportId}:`, error);
      return false;
    }
  },
};

export default ReportAuxEngineModel;
