"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VesselModel = void 0;
const uuid_1 = require("uuid");
const connection_1 = __importDefault(require("../db/connection"));
exports.VesselModel = {
    // Create a new vessel
    create(vesselData) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const stmt = connection_1.default.prepare(`
      INSERT INTO vessels (id, name, flag, imoNumber, type, deadweight, captainId, createdAt, updatedAt, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
        stmt.run(id, vesselData.name, vesselData.flag, vesselData.imoNumber, vesselData.type, // Added type
        vesselData.deadweight, vesselData.captainId, now, now);
        return this.findById(id);
    },
    // Find vessel by ID (ensure all columns including initial ROBs are selected)
    findById(id) {
        // Explicitly list columns to ensure new ones are included
        const stmt = connection_1.default.prepare(`
      SELECT 
        id, name, flag, imoNumber, type, deadweight, captainId, 
        initialRobLsifo, initialRobLsmgo, initialRobCylOil, initialRobMeOil, initialRobAeOil,
        createdAt, updatedAt, isActive 
      FROM vessels 
      WHERE id = ?
    `);
        const vessel = stmt.get(id);
        return vessel || null;
    },
    // Find vessel by IMO number (ensure all columns including initial ROBs are selected)
    findByImo(imoNumber) {
        const stmt = connection_1.default.prepare(`
      SELECT 
        id, name, flag, imoNumber, type, deadweight, captainId, 
        initialRobLsifo, initialRobLsmgo, initialRobCylOil, initialRobMeOil, initialRobAeOil,
        createdAt, updatedAt, isActive 
      FROM vessels 
      WHERE imoNumber = ?
    `);
        const vessel = stmt.get(imoNumber);
        return vessel || null;
    },
    // Get all vessels (ensure all columns including initial ROBs are selected)
    findAll() {
        const stmt = connection_1.default.prepare(`
      SELECT 
        id, name, flag, imoNumber, type, deadweight, captainId, 
        initialRobLsifo, initialRobLsmgo, initialRobCylOil, initialRobMeOil, initialRobAeOil,
        createdAt, updatedAt, isActive 
      FROM vessels 
      WHERE isActive = 1 ORDER BY name
    `);
        return stmt.all();
    },
    // Update vessel
    update(id, vesselData) {
        const now = new Date().toISOString();
        // Build the update query dynamically based on provided fields
        const updates = Object.entries(vesselData)
            .filter(([_, value]) => value !== undefined)
            .map(([key, _]) => `${key} = ?`);
        if (updates.length === 0) {
            return this.findById(id);
        }
        updates.push('updatedAt = ?');
        const sql = `
      UPDATE vessels 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;
        // Extract values in the same order as the updates
        const values = [
            ...Object.entries(vesselData)
                .filter(([_, value]) => value !== undefined)
                .map(([_, value]) => value),
            now,
            id
        ];
        const stmt = connection_1.default.prepare(sql);
        const result = stmt.run(...values);
        if (result.changes === 0) {
            return null;
        }
        return this.findById(id);
    },
    // Delete vessel (soft delete)
    delete(id) {
        const now = new Date().toISOString();
        const stmt = connection_1.default.prepare(`
      UPDATE vessels
      SET isActive = 0, updatedAt = ?
      WHERE id = ?
    `);
        const result = stmt.run(now, id);
        return result.changes > 0;
    },
    // Search vessels
    search(searchTerm) {
        const stmt = connection_1.default.prepare(`
      SELECT 
        id, name, flag, imoNumber, type, deadweight, captainId, 
        initialRobLsifo, initialRobLsmgo, initialRobCylOil, initialRobMeOil, initialRobAeOil,
        createdAt, updatedAt, isActive 
      FROM vessels
      WHERE isActive = 1
      AND (
        name LIKE ?
        OR imoNumber LIKE ?
      )
      ORDER BY name
    `);
        const term = `%${searchTerm}%`;
        return stmt.all(term, term);
    },
    // Update Initial ROB values for a vessel
    updateInitialRob(vesselId, initialRobData) {
        const now = new Date().toISOString();
        // Build the update query dynamically based on provided fields
        const updates = Object.entries(initialRobData)
            .filter(([_, value]) => value !== undefined && value !== null) // Only update if value is provided
            .map(([key, _]) => `${key} = ?`);
        if (updates.length === 0) {
            // Nothing to update
            return true;
        }
        updates.push('updatedAt = ?');
        const sql = `
      UPDATE vessels 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;
        // Extract values in the same order as the updates
        const values = [
            ...Object.entries(initialRobData)
                .filter(([_, value]) => value !== undefined && value !== null)
                .map(([_, value]) => value),
            now,
            vesselId
        ];
        try {
            const stmt = connection_1.default.prepare(sql);
            const result = stmt.run(...values);
            return result.changes > 0;
        }
        catch (error) {
            console.error(`Error updating initial ROB for vessel ${vesselId}:`, error);
            return false;
        }
    },
    // Find vessel assigned to a specific captain
    findByCaptainId(captainId) {
        const stmt = connection_1.default.prepare(`
      SELECT 
        id, name, flag, imoNumber, type, deadweight, captainId, 
        initialRobLsifo, initialRobLsmgo, initialRobCylOil, initialRobMeOil, initialRobAeOil,
        createdAt, updatedAt, isActive 
      FROM vessels 
      WHERE captainId = ? AND isActive = 1 
      LIMIT 1 
    `); // Assuming a captain is assigned to only one active vessel at a time
        const vessel = stmt.get(captainId);
        return vessel || null;
    }
};
exports.default = exports.VesselModel;
