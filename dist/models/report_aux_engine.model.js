"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportAuxEngineModel = void 0;
const uuid_1 = require("uuid");
const connection_1 = __importDefault(require("../db/connection"));
exports.ReportAuxEngineModel = {
    // Create multiple aux engine records for a single report within a transaction
    createMany(reportId, enginesData) {
        const insertStmt = connection_1.default.prepare(`
      INSERT INTO report_aux_engines (
        id, reportId, engineName, load, kw, foPress, 
        lubOilPress, waterTemp, dailyRunHour, createdAt, updatedAt
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const insertMany = connection_1.default.transaction((engines) => {
            const now = new Date().toISOString();
            for (const engine of engines) {
                insertStmt.run((0, uuid_1.v4)(), reportId, engine.engineName, engine.load ?? null, engine.kw ?? null, engine.foPress ?? null, engine.lubOilPress ?? null, engine.waterTemp ?? null, engine.dailyRunHour ?? null, now, now);
            }
        });
        try {
            insertMany(enginesData);
            return true;
        }
        catch (error) {
            console.error(`Error creating aux engines for report ${reportId}:`, error);
            return false; // Transaction automatically rolls back
        }
    },
    // Find all aux engine records for a specific report
    findByReportId(reportId) {
        const stmt = connection_1.default.prepare(`
      SELECT * FROM report_aux_engines 
      WHERE reportId = ? 
      ORDER BY engineName ASC
    `);
        return stmt.all(reportId);
    },
    // Delete all aux engine records for a specific report
    deleteByReportId(reportId) {
        const stmt = connection_1.default.prepare('DELETE FROM report_aux_engines WHERE reportId = ?');
        try {
            stmt.run(reportId);
            return true;
        }
        catch (error) {
            console.error(`Error deleting aux engines for report ${reportId}:`, error);
            return false;
        }
    },
};
exports.default = exports.ReportAuxEngineModel;
