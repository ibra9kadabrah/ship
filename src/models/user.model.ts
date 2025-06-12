import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../db/connection';
import { User, CreateUserDTO, UpdateUserDTO, UserRole } from '../types/user';

export const UserModel = {
  // Create a new user
  create(userData: CreateUserDTO): User {
    // First, check for an inactive user with the same username
    const inactiveUserStmt = db.prepare('SELECT * FROM users WHERE username = ? AND isActive = 0');
    const inactiveUser = inactiveUserStmt.get(userData.username) as User | undefined;

    if (inactiveUser) {
      // If an inactive user exists, reactivate them and update their details
      const now = new Date().toISOString();
      const hashedPassword = bcrypt.hashSync(userData.password, 10);
      const updateStmt = db.prepare(`
        UPDATE users
        SET password = ?, name = ?, role = ?, isActive = 1, updatedAt = ?
        WHERE id = ?
      `);
      updateStmt.run(hashedPassword, userData.name, userData.role, now, inactiveUser.id);
      return this.findById(inactiveUser.id) as User;
    }

    // If no inactive user exists, create a new one
    const id = uuidv4();
    const now = new Date().toISOString();
    const hashedPassword = bcrypt.hashSync(userData.password, 10);
    
    const stmt = db.prepare(`
      INSERT INTO users (id, username, password, name, role, createdAt, updatedAt, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    stmt.run(
      id,
      userData.username,
      hashedPassword,
      userData.name,
      userData.role,
      now,
      now
    );
    
    return this.findById(id) as User;
  },
  
  // Find user by ID
  findById(id: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id) as User | undefined;
    
    return user || null;
  },
  
  // Find user by username
  findByUsername(username: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND isActive = 1');
    const user = stmt.get(username) as User | undefined;
    
    return user || null;
  },
  
  // Get all users
  findAll(): User[] {
    const stmt = db.prepare('SELECT * FROM users WHERE isActive = 1 ORDER BY name');
    return stmt.all() as User[];
  },
  
  // Update user
  update(id: string, userData: UpdateUserDTO): User | null {
    const now = new Date().toISOString();
    
    // Handle password hashing if it's being updated
    if (userData.password) {
      userData.password = bcrypt.hashSync(userData.password, 10);
    }
    
    // Build the update query dynamically based on provided fields
    const updates = Object.entries(userData)
      .filter(([_, value]) => value !== undefined)
      .map(([key, _]) => `${key} = ?`);
    
    if (updates.length === 0) {
      return this.findById(id);
    }
    
    updates.push('updatedAt = ?');
    
    const sql = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;
    
    // Extract values in the same order as the updates
    const values = [
      ...Object.entries(userData)
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
  
  // Delete user (soft delete)
  delete(id: string): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE users
      SET isActive = 0, updatedAt = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(now, id);
    return result.changes > 0;
  },
  
  // Verify user credentials
  verifyCredentials(username: string, password: string): User | null {
    const user = this.findByUsername(username);
    
    if (!user || !user.isActive) {
      return null;
    }
    
    const passwordMatch = bcrypt.compareSync(password, user.password);
    
    if (!passwordMatch) {
      return null;
    }
    
    return user;
  },
  
  // Get users by role
  findByRole(role: UserRole): User[] {
    const stmt = db.prepare('SELECT * FROM users WHERE role = ? AND isActive = 1 ORDER BY name');
    return stmt.all(role) as User[];
  },
  
  // Check if any admin exists
  adminExists(): boolean {
    // Use single quotes for string literals in SQLite, not double quotes
    const stmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND isActive = 1");
    const result = stmt.get() as { count: number };
    
    return result.count > 0;
  }
};

export default UserModel;