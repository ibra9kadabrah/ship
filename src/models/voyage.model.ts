// src/models/voyage.model.ts
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';
import { Voyage, CreateVoyageDTO, VoyageStatus } from '../types/voyage';

export const VoyageModel = {
  // Create a new voyage
  create(voyageData: CreateVoyageDTO): Voyage {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Generate voyage number (format: nn/yyyy)
    const year = new Date().getFullYear();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM voyages WHERE voyageNumber LIKE ?');
    const result = stmt.get(`%/${year}`) as { count: number };
    const voyageNumber = `${(result.count + 1).toString().padStart(2, '0')}/${year}`;
    
    const insertStmt = db.prepare(`
      INSERT INTO voyages (
        id, vesselId, voyageNumber, departurePort, destinationPort, 
        voyageDistance, startDate, status, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertStmt.run(
      id,
      voyageData.vesselId,
      voyageNumber,
      voyageData.departurePort,
      voyageData.destinationPort,
      voyageData.voyageDistance,
      voyageData.startDate,
      'active' as VoyageStatus,
      now,
      now
    );
    
    return this.findById(id) as Voyage;
  },
  
  // Find voyage by ID
  findById(id: string): Voyage | null {
    const stmt = db.prepare('SELECT * FROM voyages WHERE id = ?');
    const voyage = stmt.get(id) as Voyage | undefined;
    
    return voyage || null;
  },
  
  // Find active voyage by vessel ID
  findActiveByVesselId(vesselId: string): Voyage | null {
    const stmt = db.prepare('SELECT * FROM voyages WHERE vesselId = ? AND status = ? ORDER BY createdAt DESC LIMIT 1');
    const voyage = stmt.get(vesselId, 'active') as Voyage | undefined;
    
    return voyage || null;
  },

  // Find all voyages by vessel ID
  findAllByVesselId(vesselId: string): Voyage[] {
    const stmt = db.prepare('SELECT * FROM voyages WHERE vesselId = ? ORDER BY createdAt ASC');
    const voyages = stmt.all(vesselId) as Voyage[];
    return voyages || [];
  },
  
  // Complete voyage
  completeVoyage(id: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE voyages
      SET status = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    const result = stmt.run('completed', now, id);
    return result.changes > 0;
  },
  
  // Get latest voyage number for a vessel
  getLatestVoyageNumber(vesselId: string): string | null {
    const stmt = db.prepare(`
      SELECT voyageNumber 
      FROM voyages 
      WHERE vesselId = ? 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);
    
    const result = stmt.get(vesselId) as { voyageNumber: string } | undefined;
    return result ? result.voyageNumber : null;
  },

  // Find the latest completed voyage for a specific vessel
  findLatestCompletedByVesselId(vesselId: string): Voyage | null {
    const stmt = db.prepare(`
      SELECT * 
      FROM voyages 
      WHERE vesselId = ? AND status = 'completed' 
      ORDER BY createdAt DESC 
      LIMIT 1
    `);
    const voyage = stmt.get(vesselId) as Voyage | undefined;
    return voyage || null;
  }
};

export default VoyageModel;
