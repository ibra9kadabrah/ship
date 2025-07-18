import { v4 as uuidv4 } from 'uuid';
import { PoolClient } from 'pg';
import pool from '../db/connection';
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
  async create(vesselData: CreateVesselDTO, client: PoolClient | import('pg').Pool = pool): Promise<Vessel> {
    const id = uuidv4();
    
    await client.query(
      `INSERT INTO vessels (id, name, flag, imoNumber, type, deadweight, captainId, isActive)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [id, vesselData.name, vesselData.flag, vesselData.imoNumber, vesselData.type, vesselData.deadweight, vesselData.captainId]
    );
    
    return (await this.findById(id, client)) as Vessel;
  },
  
  // Find vessel by ID (ensure all columns including initial ROBs are selected)
  async findById(id: string, client: PoolClient | import('pg').Pool = pool): Promise<Vessel | null> {
    const res = await client.query('SELECT * FROM vessels WHERE id = $1', [id]);
    return (res.rows[0] as Vessel) || null;
  },
  
  // Find vessel by IMO number (ensure all columns including initial ROBs are selected)
  async findByImo(imoNumber: string, client: PoolClient | import('pg').Pool = pool): Promise<Vessel | null> {
    const res = await client.query('SELECT * FROM vessels WHERE imoNumber = $1', [imoNumber]);
    return (res.rows[0] as Vessel) || null;
  },
  
  // Get all vessels (ensure all columns including initial ROBs are selected)
  async findAll(client: PoolClient | import('pg').Pool = pool): Promise<Vessel[]> {
    const res = await client.query('SELECT * FROM vessels WHERE isActive = true ORDER BY name');
    return res.rows as Vessel[];
  },
  
  // Update vessel
  async update(id: string, vesselData: UpdateVesselDTO, client: PoolClient | import('pg').Pool = pool): Promise<Vessel | null> {
    const updates = Object.entries(vesselData)
      .filter(([_, value]) => value !== undefined)
      .map(([key, _], i) => `${key} = $${i + 1}`);
    
    if (updates.length === 0) {
      return this.findById(id, client);
    }
    
    updates.push(`updatedAt = NOW()`);
    
    const sql = `
      UPDATE vessels 
      SET ${updates.join(', ')}
      WHERE id = $${updates.length + 1}
    `;
    
    const values = [
      ...Object.values(vesselData).filter(v => v !== undefined),
      id
    ];
    
    const res = await client.query(sql, values);
    
    if (res.rowCount === 0) {
      return null;
    }
    
    return this.findById(id, client);
  },
  
  // Delete vessel (soft delete)
  async delete(id: string, client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    const res = await client.query('UPDATE vessels SET isActive = false, updatedAt = NOW() WHERE id = $1', [id]);
    return res.rowCount! > 0;
  },
  
  // Search vessels
  async search(searchTerm: string, client: PoolClient | import('pg').Pool = pool): Promise<Vessel[]> {
    const term = `%${searchTerm}%`;
    const res = await client.query(
      `SELECT * FROM vessels
       WHERE isActive = true AND (name LIKE $1 OR imoNumber LIKE $2)
       ORDER BY name`,
      [term, term]
    );
    return res.rows as Vessel[];
  },

  // Update Initial ROB values for a vessel
  async updateInitialRob(vesselId: string, initialRobData: InitialRobData, client: PoolClient | import('pg').Pool = pool): Promise<boolean> {
    const updates = Object.entries(initialRobData)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, _], i) => `${key} = $${i + 1}`);
      
    if (updates.length === 0) {
      return true; 
    }
    
    updates.push('updatedAt = NOW()');
    
    const sql = `
      UPDATE vessels 
      SET ${updates.join(', ')}
      WHERE id = $${updates.length + 1}
    `;
    
    const values = [
      ...Object.values(initialRobData).filter(v => v !== undefined && v !== null),
      vesselId
    ];
    
    try {
      const res = await client.query(sql, values);
      return res.rowCount! > 0;
    } catch (error) {
      console.error(`Error updating initial ROB for vessel ${vesselId}:`, error);
      return false;
    }
  },

  // Find vessel assigned to a specific captain
  async findByCaptainId(captainId: string, client: PoolClient | import('pg').Pool = pool): Promise<Vessel | null> {
    const res = await client.query('SELECT * FROM vessels WHERE captainId = $1 AND isActive = true LIMIT 1', [captainId]);
    return (res.rows[0] as Vessel) || null;
  }
};

export default VesselModel;
