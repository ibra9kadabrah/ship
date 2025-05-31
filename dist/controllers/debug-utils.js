"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNoonReportDistances = void 0;
// src/controllers/debug-utils.ts
const connection_1 = __importDefault(require("../db/connection"));
/**
 * Utility to update the distanceSinceLastReport field for existing noon reports
 * This is useful for fixing existing reports that didn't have the field properly stored
 */
const updateNoonReportDistances = () => {
    try {
        // Begin a transaction
        connection_1.default.transaction(() => {
            // Get noon reports with calculations
            const reports = connection_1.default.prepare(`
        SELECT id, reportType, totalDistanceTravelled, distanceSinceLastReport
        FROM reports
        WHERE reportType = 'noon' OR reportType = 'arrival' OR reportType = 'arrival_anchor_noon'
        ORDER BY reportDate ASC
      `).all();
            console.log(`Found ${reports.length} reports to check for distanceSinceLastReport`);
            let updatedCount = 0;
            // For each report with a non-null totalDistanceTravelled but null distanceSinceLastReport,
            // try to reconstruct the value
            for (const report of reports) {
                // If distanceSinceLastReport is null but we have calculated fields, we can try to reconstruct
                if (report.distanceSinceLastReport === null && report.totalDistanceTravelled !== null) {
                    console.log(`Attempting to fix report ${report.id} with totalDistanceTravelled=${report.totalDistanceTravelled}`);
                    const previousReport = connection_1.default.prepare(`
            SELECT id, totalDistanceTravelled
            FROM reports
            WHERE id != ? AND reportDate < (SELECT reportDate FROM reports WHERE id = ?)
            ORDER BY reportDate DESC
            LIMIT 1
          `).get(report.id, report.id);
                    if (previousReport && previousReport.totalDistanceTravelled !== null) {
                        // Calculate what distanceSinceLastReport would have been
                        const distance = report.totalDistanceTravelled - previousReport.totalDistanceTravelled;
                        if (distance >= 0) { // Only update if the calculated value makes sense
                            // Update the report
                            const updateStmt = connection_1.default.prepare(`
                UPDATE reports
                SET distanceSinceLastReport = ?
                WHERE id = ?
              `);
                            updateStmt.run(distance, report.id);
                            updatedCount++;
                            console.log(`Updated report ${report.id} with distanceSinceLastReport=${distance}`);
                        }
                        else {
                            console.log(`Skipping report ${report.id}: calculated distance (${distance}) is negative`);
                        }
                    }
                    else {
                        console.log(`Cannot find previous report for ${report.id} to calculate distance`);
                    }
                }
            }
            console.log(`Updated ${updatedCount} reports with reconstructed distanceSinceLastReport values`);
        })();
        return { success: true, message: 'Distance update completed successfully' };
    }
    catch (error) {
        console.error('Error updating distances:', error);
        return { success: false, error: String(error) };
    }
};
exports.updateNoonReportDistances = updateNoonReportDistances;
exports.default = { updateNoonReportDistances: exports.updateNoonReportDistances };
