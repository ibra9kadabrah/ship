import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model';
import { CreateUserDTO, UserLoginDTO } from '../types/user';

// JWT secret should be in environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'mrv-ship-reporting-secret';
const TOKEN_EXPIRY = '24h';

export const AuthController = {
  // Register a new user (admin only)
  register(req: Request, res: Response): void {
    try {
      const userData: CreateUserDTO = req.body;
      
      // Check if username already exists
      const existingUser = UserModel.findByUsername(userData.username);
      if (existingUser) {
        res.status(400).json({ error: 'Username already exists' });
        return;
      }
      
      // Create the user
      const user = UserModel.create(userData);
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  },
  
  // Login
  login(req: Request, res: Response): void {
    try {
      const loginData: UserLoginDTO = req.body;
      
      // Verify credentials
      const user = UserModel.verifyCredentials(loginData.username, loginData.password);
      
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      
      // Generate JWT token
      const { password, ...userWithoutPassword } = user;
      const token = jwt.sign(userWithoutPassword, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
      
      // Return user and token
      res.status(200).json({
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  },
  
  // Create initial admin (only if no admin exists)
  createInitialAdmin(req: Request, res: Response): void {
    try {
      // Check if admin already exists
      if (UserModel.adminExists()) {
        res.status(400).json({ error: 'Admin already exists' });
        return;
      }
      
      const adminData: CreateUserDTO = req.body;
      
      // Force role to be admin
      adminData.role = 'admin';
      
      // Create the admin user
      const admin = UserModel.create(adminData);
      
      // Don't return the password
      const { password, ...adminWithoutPassword } = admin;
      
      res.status(201).json(adminWithoutPassword);
    } catch (error) {
      console.error('Error creating initial admin:', error);
      res.status(500).json({ error: 'Failed to create initial admin' });
    }
  }
};

export default AuthController;