"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoyageModel = void 0;
// src/models/voyage.model.ts
const uuid_1 = require("uuid");
const connection_1 = __importDefault(require("../db/connection"));
const report_model_1 = __importDefault(require("./report.model")); // Import ReportRecordData
exports.VoyageModel = {
    // Create a new voyage
    create(voyageData) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        // Generate voyage number (format: nn/yyyy)
        const year = new Date().getFullYear();
        const stmt = connection_1.default.prepare('SELECT COUNT(*) as count FROM voyages WHERE voyageNumber LIKE ?');
        const result = stmt.get(`%/${year}`);
        const voyageNumber = `${(result.count + 1).toString().padStart(2, '0')}/${year}`;
        const insertStmt = connection_1.default.prepare(`
      INSERT INTO voyages (
        id, vesselId, voyageNumber, departurePort, destinationPort, 
        voyageDistance, startDate, status, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        insertStmt.run(id, voyageData.vesselId, voyageNumber, voyageData.departurePort, voyageData.destinationPort, voyageData.voyageDistance, voyageData.startDate, 'active', now, now);
        return this.findById(id);
    },
    // Find voyage by ID
    findById(id) {
        const stmt = connection_1.default.prepare('SELECT * FROM voyages WHERE id = ?');
        const voyage = stmt.get(id);
        return voyage || null;
    },
    // Find active voyage by vessel ID
    findActiveByVesselId(vesselId) {
        const stmt = connection_1.default.prepare('SELECT * FROM voyages WHERE vesselId = ? AND status = ? ORDER BY createdAt DESC LIMIT 1');
        const voyage = stmt.get(vesselId, 'active');
        return voyage || null;
    },
    // Find all voyages by vessel ID
    findAllByVesselId(vesselId) {
        const stmt = connection_1.default.prepare('SELECT * FROM voyages WHERE vesselId = ? ORDER BY createdAt ASC');
        const voyages = stmt.all(vesselId);
        return voyages || [];
    },
    // Complete voyage
    completeVoyage(id) {
        const now = new Date().toISOString();
        const stmt = connection_1.default.prepare(`
      UPDATE voyages
      SET status = ?, updatedAt = ?
      WHERE id = ?
    `);
        const result = stmt.run('completed', now, id);
        return result.changes > 0;
    },
    // Get latest voyage number for a vessel
    getLatestVoyageNumber(vesselId) {
        const stmt = connection_1.default.prepare(`
      SELECT voyageNumber 
      FROM voyages 
      WHERE vesselId = ? 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);
        const result = stmt.get(vesselId);
        return result ? result.voyageNumber : null;
    },
    // Find the latest completed voyage for a specific vessel
    findLatestCompletedByVesselId(vesselId) {
        const stmt = connection_1.default.prepare(`
      SELECT * 
      FROM voyages 
      WHERE vesselId = ? AND status = 'completed' 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);
        const voyage = stmt.get(vesselId);
        return voyage || null;
    },
    // Find the latest completed voyage for a specific vessel, including its last cargo state
    findLatestCompletedWithCargoByVesselId(vesselId) {
        const stmt = connection_1.default.prepare(`
      SELECT *
      FROM voyages
      WHERE vesselId = ? AND status = 'completed'
      ORDER BY createdAt DESC
      LIMIT 1
    `);
        const voyage = stmt.get(vesselId);
        if (!voyage) {
            return null;
        }
        // Get the last approved report for this completed voyage
        const lastReportData = report_model_1.default.getLatestApprovedReportForVoyage(voyage.id);
        if (!lastReportData) {
            // If no last report, assume no cargo carried over from this voyage
            return { ...voyage, lastCargoQuantity: 0, lastCargoStatus: 'Empty', lastCargoType: null };
        }
        let cargoQuantity = 0;
        let cargoType = null;
        let determinedCargoStatus = 'Empty';
        if (lastReportData) {
            const lastReport = lastReportData; // Cast to access all table columns
            if (lastReport.cargoQuantity !== undefined && lastReport.cargoQuantity !== null) {
                cargoQuantity = lastReport.cargoQuantity;
            }
            if (cargoQuantity > 0) {
                determinedCargoStatus = 'Loaded'; // Default if quantity > 0
                if (lastReport.cargoStatus) { // If a specific status is on the last report, use it
                    determinedCargoStatus = lastReport.cargoStatus;
                }
            }
            else {
                determinedCargoStatus = 'Empty';
            }
            if (lastReport.cargoType) {
                cargoType = lastReport.cargoType;
            }
            else {
                // Attempt to get from the first report of the voyage if not on the last one
                const firstReportData = report_model_1.default.getFirstReportForVoyage(voyage.id);
                if (firstReportData) {
                    const firstReport = firstReportData;
                    if (firstReport.cargoType) {
                        cargoType = firstReport.cargoType;
                    }
                }
            }
        }
        return {
            ...voyage,
            lastCargoQuantity: cargoQuantity,
            lastCargoStatus: determinedCargoStatus,
            lastCargoType: cargoType,
        };
    }
};
exports.default = exports.VoyageModel;
