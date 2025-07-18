// src/controllers/debug-utils.ts
import pool from '../db/connection';

/**
 * Utility to update the distanceSinceLastReport field for existing noon reports
 * This is useful for fixing existing reports that didn't have the field properly stored
 */
export const updateNoonReportDistances = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    interface ReportRecord {
      id: string;
      reportType: string;
      totalDistanceTravelled: number | null;
      distanceSinceLastReport: number | null;
      reportDate: string;
    }
    
    const reportsRes = await client.query(`
      SELECT id, reportType, totalDistanceTravelled, distanceSinceLastReport, "reportDate"
      FROM reports
      WHERE reportType = 'noon' OR reportType = 'arrival' OR reportType = 'arrival_anchor_noon'
      ORDER BY "reportDate" ASC
    `);
    const reports = reportsRes.rows as ReportRecord[];
    
    console.log(`Found ${reports.length} reports to check for distanceSinceLastReport`);
    
    let updatedCount = 0;
    
    for (const report of reports) {
      if (report.distanceSinceLastReport === null && report.totalDistanceTravelled !== null) {
        console.log(`Attempting to fix report ${report.id} with totalDistanceTravelled=${report.totalDistanceTravelled}`);
        
        interface PreviousReportRecord {
          id: string;
          totalDistanceTravelled: number | null;
        }
        
        const previousReportRes = await client.query(`
          SELECT id, totalDistanceTravelled
          FROM reports
          WHERE id != $1 AND "reportDate" < $2
          ORDER BY "reportDate" DESC
          LIMIT 1
        `, [report.id, report.reportDate]);
        const previousReport = previousReportRes.rows[0] as PreviousReportRecord | undefined;
        
        if (previousReport && previousReport.totalDistanceTravelled !== null) {
          const distance = report.totalDistanceTravelled - previousReport.totalDistanceTravelled;
          
          if (distance >= 0) {
            await client.query(
              'UPDATE reports SET distanceSinceLastReport = $1 WHERE id = $2',
              [distance, report.id]
            );
            updatedCount++;
            console.log(`Updated report ${report.id} with distanceSinceLastReport=${distance}`);
          } else {
            console.log(`Skipping report ${report.id}: calculated distance (${distance}) is negative`);
          }
        } else {
          console.log(`Cannot find previous report for ${report.id} to calculate distance`);
        }
      }
    }
    
    await client.query('COMMIT');
    console.log(`Updated ${updatedCount} reports with reconstructed distanceSinceLastReport values`);
    
    return { success: true, message: 'Distance update completed successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating distances:', error);
    return { success: false, error: String(error) };
  } finally {
    client.release();
  }
};

export default { updateNoonReportDistances };