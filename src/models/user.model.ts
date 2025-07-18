import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import pool from '../db/connection';
import { User, CreateUserDTO, UpdateUserDTO, UserRole } from '../types/user';

export const UserModel = {
  // Create a new user
  async create(userData: CreateUserDTO): Promise<User> {
    // First, check for an inactive user with the same username
    const inactiveUserRes = await pool.query('SELECT * FROM users WHERE username = $1 AND isActive = false', [userData.username]);
    const inactiveUser = inactiveUserRes.rows[0] as User | undefined;

    if (inactiveUser) {
      // If an inactive user exists, reactivate them and update their details
      const hashedPassword = bcrypt.hashSync(userData.password, 10);
      await pool.query(
        'UPDATE users SET password = $1, name = $2, role = $3, isActive = true, updatedAt = NOW() WHERE id = $4',
        [hashedPassword, userData.name, userData.role, inactiveUser.id]
      );
      return (await this.findById(inactiveUser.id)) as User;
    }

    // If no inactive user exists, create a new one
    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(userData.password, 10);
    
    await pool.query(
      'INSERT INTO users (id, username, password, name, role, isActive) VALUES ($1, $2, $3, $4, $5, true)',
      [id, userData.username, hashedPassword, userData.name, userData.role]
    );
    
    return (await this.findById(id)) as User;
  },
  
  // Find user by ID
  async findById(id: string): Promise<User | null> {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return (res.rows[0] as User) || null;
  },
  
  // Find user by username
  async findByUsername(username: string): Promise<User | null> {
    const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return (res.rows[0] as User) || null;
  },
  
  // Get all users
  async findAll(): Promise<User[]> {
    const res = await pool.query('SELECT * FROM users WHERE isActive = true ORDER BY name');
    return res.rows as User[];
  },
  
  // Update user
  async update(id: string, userData: UpdateUserDTO): Promise<User | null> {
    // Handle password hashing if it's being updated
    if (userData.password) {
      userData.password = bcrypt.hashSync(userData.password, 10);
    }
    
    // Build the update query dynamically based on provided fields
    const updates = Object.entries(userData)
      .filter(([_, value]) => value !== undefined)
      .map(([key, _], i) => `${key} = ${i + 1}`);
    
    if (updates.length === 0) {
      return this.findById(id);
    }
    
    updates.push(`updatedAt = NOW()`);
    
    const sql = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ${updates.length + 1}
    `;
    
    // Extract values in the same order as the updates
    const values = [
      ...Object.values(userData).filter(v => v !== undefined),
      id
    ];
    
    const res = await pool.query(sql, values);
    
    if (res.rowCount === 0) {
      return null;
    }
    
    return this.findById(id);
  },
  
  // Delete user (soft delete)
  async delete(id: string): Promise<boolean> {
    const res = await pool.query('UPDATE users SET isActive = false, updatedAt = NOW() WHERE id = $1', [id]);
    return res.rowCount! > 0;
  },
  
  // Verify user credentials
  async verifyCredentials(username: string, password: string): Promise<User | null> {
    console.log(`[AUTH_DEBUG] Attempting to verify credentials for username: "${username}"`);
    const user = await this.findByUsername(username);
    
    if (!user) {
      console.log(`[AUTH_DEBUG] User not found.`);
      return null;
    }
    console.log(`[AUTH_DEBUG] User found: ${JSON.stringify(user, null, 2)}`);

    if (!user.isactive) {
      console.log(`[AUTH_DEBUG] User is not active.`);
      return null;
    }
    
    const passwordMatch = bcrypt.compareSync(password, user.password);
    console.log(`[AUTH_DEBUG] Password match result: ${passwordMatch}`);
    
    if (!passwordMatch) {
      console.log(`[AUTH_DEBUG] Password does not match.`);
      return null;
    }
    
    console.log(`[AUTH_DEBUG] Credentials verified successfully.`);
    return user;
  },
  
  // Get users by role
  async findByRole(role: UserRole): Promise<User[]> {
    const res = await pool.query('SELECT * FROM users WHERE role = $1 AND isActive = true ORDER BY name', [role]);
    return res.rows as User[];
  },
  
  // Check if any admin exists
  async adminExists(): Promise<boolean> {
    const res = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND isActive = true");
    return (res.rows[0].count as number) > 0;
  }
};

export default UserModel;