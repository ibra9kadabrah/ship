"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeCaptain = exports.authorizeOffice = exports.authorizeAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// JWT secret should be in environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'mrv-ship-reporting-secret';
const authenticate = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const authorizeAdmin = (req, res, next) => {
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
exports.authorizeAdmin = authorizeAdmin;
const authorizeOffice = (req, res, next) => {
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
exports.authorizeOffice = authorizeOffice;
const authorizeCaptain = (req, res, next) => {
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
exports.authorizeCaptain = authorizeCaptain;
