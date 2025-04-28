import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { CreateVesselDTO, UpdateVesselDTO, Vessel } from '../types/vessel';

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
  
  // Find vessel by ID
  findById(id: string): Vessel | null {
    const stmt = db.prepare('SELECT * FROM vessels WHERE id = ?');
    const vessel = stmt.get(id) as Vessel | undefined;
    
    return vessel || null;
  },
  
  // Find vessel by IMO number
  findByImo(imoNumber: string): Vessel | null {
    const stmt = db.prepare('SELECT * FROM vessels WHERE imoNumber = ?');
    const vessel = stmt.get(imoNumber) as Vessel | undefined;
    
    return vessel || null;
  },
  
  // Get all vessels
  findAll(): Vessel[] {
    const stmt = db.prepare('SELECT * FROM vessels WHERE isActive = 1 ORDER BY name');
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
  }
};

export default VesselModel;