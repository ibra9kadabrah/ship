import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types/user';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// JWT secret should be in environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'mrv-ship-reporting-secret';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'Authorization token required' });
    return;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
};

export const authorizeOffice = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'office') {
    res.status(403).json({ error: 'Office or admin access required' });
    return;
  }
  
  next();
};

export const authorizeCaptain = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  
  if (req.user.role !== 'captain') {
    res.status(403).json({ error: 'Captain access required' });
    return;
  }
  
  next();
};