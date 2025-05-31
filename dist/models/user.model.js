"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const connection_1 = __importDefault(require("../db/connection"));
exports.UserModel = {
    // Create a new user
    create(userData) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const hashedPassword = bcryptjs_1.default.hashSync(userData.password, 10);
        const stmt = connection_1.default.prepare(`
      INSERT INTO users (id, username, password, name, role, createdAt, updatedAt, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
        stmt.run(id, userData.username, hashedPassword, userData.name, userData.role, now, now);
        return this.findById(id);
    },
    // Find user by ID
    findById(id) {
        const stmt = connection_1.default.prepare('SELECT * FROM users WHERE id = ?');
        const user = stmt.get(id);
        return user || null;
    },
    // Find user by username
    findByUsername(username) {
        const stmt = connection_1.default.prepare('SELECT * FROM users WHERE username = ?');
        const user = stmt.get(username);
        return user || null;
    },
    // Get all users
    findAll() {
        const stmt = connection_1.default.prepare('SELECT * FROM users WHERE isActive = 1 ORDER BY name');
        return stmt.all();
    },
    // Update user
    update(id, userData) {
        const now = new Date().toISOString();
        // Handle password hashing if it's being updated
        if (userData.password) {
            userData.password = bcryptjs_1.default.hashSync(userData.password, 10);
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
        const stmt = connection_1.default.prepare(sql);
        const result = stmt.run(...values);
        if (result.changes === 0) {
            return null;
        }
        return this.findById(id);
    },
    // Delete user (soft delete)
    delete(id) {
        const now = new Date().toISOString();
        const stmt = connection_1.default.prepare(`
      UPDATE users
      SET isActive = 0, updatedAt = ?
      WHERE id = ?
    `);
        const result = stmt.run(now, id);
        return result.changes > 0;
    },
    // Verify user credentials
    verifyCredentials(username, password) {
        const user = this.findByUsername(username);
        if (!user || !user.isActive) {
            return null;
        }
        const passwordMatch = bcryptjs_1.default.compareSync(password, user.password);
        if (!passwordMatch) {
            return null;
        }
        return user;
    },
    // Get users by role
    findByRole(role) {
        const stmt = connection_1.default.prepare('SELECT * FROM users WHERE role = ? AND isActive = 1 ORDER BY name');
        return stmt.all(role);
    },
    // Check if any admin exists
    adminExists() {
        // Use single quotes for string literals in SQLite, not double quotes
        const stmt = connection_1.default.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND isActive = 1");
        const result = stmt.get();
        return result.count > 0;
    }
};
exports.default = exports.UserModel;
