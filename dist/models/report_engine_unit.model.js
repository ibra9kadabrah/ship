"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportEngineUnitModel = void 0;
const uuid_1 = require("uuid");
const connection_1 = __importDefault(require("../db/connection"));
exports.ReportEngineUnitModel = {
    // Create multiple engine unit records for a single report within a transaction
    createMany(reportId, unitsData) {
        const insertStmt = connection_1.default.prepare(`
      INSERT INTO report_engine_units (
        id, reportId, unitNumber, exhaustTemp, underPistonAir, 
        pcoOutletTemp, jcfwOutletTemp, createdAt, updatedAt
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const insertMany = connection_1.default.transaction((units) => {
            const now = new Date().toISOString();
            for (const unit of units) {
                insertStmt.run((0, uuid_1.v4)(), reportId, unit.unitNumber, unit.exhaustTemp ?? null, unit.underPistonAir ?? null, unit.pcoOutletTemp ?? null, unit.jcfwOutletTemp ?? null, now, now);
            }
        });
        try {
            insertMany(unitsData);
            return true;
        }
        catch (error) {
            console.error(`Error creating engine units for report ${reportId}:`, error);
            return false; // Transaction automatically rolls back
        }
    },
    // Find all engine unit records for a specific report
    findByReportId(reportId) {
        const stmt = connection_1.default.prepare(`
      SELECT * FROM report_engine_units 
      WHERE reportId = ? 
      ORDER BY unitNumber ASC
    `);
        return stmt.all(reportId);
    },
    // Delete all engine unit records for a specific report
    deleteByReportId(reportId) {
        const stmt = connection_1.default.prepare('DELETE FROM report_engine_units WHERE reportId = ?');
        try {
            stmt.run(reportId);
            return true;
        }
        catch (error) {
            console.error(`Error deleting engine units for report ${reportId}:`, error);
            return false;
        }
    },
};
exports.default = exports.ReportEngineUnitModel;
