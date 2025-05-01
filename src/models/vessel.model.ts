import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { CreateVesselDTO, UpdateVesselDTO, Vessel } from '../types/vessel';

// Define the structure for initial ROB data
interface InitialRobData {
  initialRobLsifo?: number;
  initialRobLsmgo?: number;
  initialRobCylOil?: number;
  initialRobMeOil?: number;
  initialRobAeOil?: number;
}

export const VesselModel = {
  // Create a new vessel
  create(vesselData: CreateVesselDTO): Vessel {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO vessels (id, name, flag, imoNumber, deadweight, captainId, createdAt, updatedAt, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    stmt.run(
      id,
      vesselData.name,
      vesselData.flag,
      vesselData.imoNumber,
      vesselData.deadweight,
      vesselData.captainId,
      now,
      now
    );
    
    return this.findById(id) as Vessel;
  },
  
  // Find vessel by ID (ensure all columns including initial ROBs are selected)
  findById(id: string): Vessel | null {
    // Explicitly list columns to ensure new ones are included
    const stmt = db.prepare(`
      SELECT 
        id, name, flag, imoNumber, deadweight, captainId, 
        initialRobLsifo, initialRobLsmgo, initialRobCylOil, initialRobMeOil, initialRobAeOil,
        createdAt, updatedAt, isActive 
      FROM vessels 
      WHERE id = ?
    `);
    const vessel = stmt.get(id) as Vessel | undefined;
    
    return vessel || null;
  },
  
  // Find vessel by IMO number (ensure all columns including initial ROBs are selected)
  findByImo(imoNumber: string): Vessel | null {
    const stmt = db.prepare(`
      SELECT 
        id, name, flag, imoNumber, deadweight, captainId, 
        initialRobLsifo, initialRobLsmgo, initialRobCylOil, initialRobMeOil, initialRobAeOil,
        createdAt, updatedAt, isActive 
      FROM vessels 
      WHERE imoNumber = ?
    `);
    const vessel = stmt.get(imoNumber) as Vessel | undefined;
    
    return vessel || null;
  },
  
  // Get all vessels (ensure all columns including initial ROBs are selected)
  findAll(): Vessel[] {
    const stmt = db.prepare(`
      SELECT 
        id, name, flag, imoNumber, deadweight, captainId, 
        initialRobLsifo, initialRobLsmgo, initialRobCylOil, initialRobMeOil, initialRobAeOil,
        createdAt, updatedAt, isActive 
      FROM vessels 
      WHERE isActive = 1 ORDER BY name
    `);
    return stmt.all() as Vessel[];
  },
  
  // Update vessel
  update(id: string, vesselData: UpdateVesselDTO): Vessel | null {
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
    
    const stmt = db.prepare(sql);
    const result = stmt.run(...values);
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.findById(id);
  },
  
  // Delete vessel (soft delete)
  delete(id: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE vessels
      SET isActive = 0, updatedAt = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(now, id);
    return result.changes > 0;
  },
  
  // Search vessels
  search(searchTerm: string): Vessel[] {
    const stmt = db.prepare(`
      SELECT * FROM vessels
      WHERE isActive = 1
      AND (
        name LIKE ?
        OR imoNumber LIKE ?
      )
      ORDER BY name
    `);
    
    const term = `%${searchTerm}%`;
    return stmt.all(term, term) as Vessel[];
  },

  // Update Initial ROB values for a vessel
  updateInitialRob(vesselId: string, initialRobData: InitialRobData): boolean {
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
      const stmt = db.prepare(sql);
      const result = stmt.run(...values);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error updating initial ROB for vessel ${vesselId}:`, error);
      return false;
    }
  },

  // Find vessel assigned to a specific captain
  findByCaptainId(captainId: string): Vessel | null {
    const stmt = db.prepare(`
      SELECT 
        id, name, flag, imoNumber, deadweight, captainId, 
        initialRobLsifo, initialRobLsmgo, initialRobCylOil, initialRobMeOil, initialRobAeOil,
        createdAt, updatedAt, isActive 
      FROM vessels 
      WHERE captainId = ? AND isActive = 1 
      LIMIT 1 
    `); // Assuming a captain is assigned to only one active vessel at a time
    const vessel = stmt.get(captainId) as Vessel | undefined;
    return vessel || null;
  }
};

export default VesselModel;
