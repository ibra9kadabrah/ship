"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../models/user.model"));
// JWT secret should be in environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'mrv-ship-reporting-secret';
const TOKEN_EXPIRY = '24h';
exports.AuthController = {
    // Register a new user (admin only)
    register(req, res) {
        try {
            const userData = req.body;
            // Check if username already exists
            const existingUser = user_model_1.default.findByUsername(userData.username);
            if (existingUser) {
                res.status(400).json({ error: 'Username already exists' });
                return;
            }
            // Create the user
            const user = user_model_1.default.create(userData);
            // Don't return the password
            const { password, ...userWithoutPassword } = user;
            res.status(201).json(userWithoutPassword);
        }
        catch (error) {
            console.error('Error registering user:', error);
            res.status(500).json({ error: 'Failed to register user' });
        }
    },
    // Login
    login(req, res) {
        try {
            const loginData = req.body;
            // Verify credentials
            const user = user_model_1.default.verifyCredentials(loginData.username, loginData.password);
            if (!user) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }
            // Generate JWT token
            const { password, ...userWithoutPassword } = user;
            const token = jsonwebtoken_1.default.sign(userWithoutPassword, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
            // Return user and token
            res.status(200).json({
                user: userWithoutPassword,
                token
            });
        }
        catch (error) {
            console.error('Error logging in:', error);
            res.status(500).json({ error: 'Failed to login' });
        }
    },
    // Create initial admin (only if no admin exists)
    createInitialAdmin(req, res) {
        try {
            // Check if admin already exists
            if (user_model_1.default.adminExists()) {
                res.status(400).json({ error: 'Admin already exists' });
                return;
            }
            const adminData = req.body;
            // Force role to be admin
            adminData.role = 'admin';
            // Create the admin user
            const admin = user_model_1.default.create(adminData);
            // Don't return the password
            const { password, ...adminWithoutPassword } = admin;
            res.status(201).json(adminWithoutPassword);
        }
        catch (error) {
            console.error('Error creating initial admin:', error);
            res.status(500).json({ error: 'Failed to create initial admin' });
        }
    },
    // Get users by role (admin only)
    getUsersByRole(req, res) {
        try {
            const role = req.query.role;
            // Validate role query parameter
            if (!role || !['admin', 'captain', 'office'].includes(role)) {
                res.status(400).json({ error: 'Invalid or missing role query parameter. Must be admin, captain, or office.' });
                return;
            }
            const users = user_model_1.default.findByRole(role);
            // Exclude passwords from the response
            const usersWithoutPasswords = users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });
            res.status(200).json(usersWithoutPasswords);
        }
        catch (error) {
            console.error('Error fetching users by role:', error);
            res.status(500).json({ error: 'Failed to fetch users by role' });
        }
    }
};
exports.default = exports.AuthController;
