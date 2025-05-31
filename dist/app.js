"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const voyage_routes_1 = __importDefault(require("./routes/voyage.routes")); // Add import for voyage routes
const debug_routes_1 = __importDefault(require("./routes/debug.routes")); // Add import for debug routes
const vessel_routes_1 = __importDefault(require("./routes/vessel.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const setup_1 = require("./db/setup");
// Load environment variables
dotenv_1.default.config();
// Setup database
(0, setup_1.setupDatabase)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/vessels', vessel_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api/voyages', voyage_routes_1.default); // Mount voyage routes
app.use('/api/debug', debug_routes_1.default); // Mount debug routes
// Admin URL handler
app.use('/admin', (req, res, next) => {
    // This is just a placeholder for admin route handling
    // In a real implementation, you might serve an admin frontend here
    next();
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'MRV Ship Reporting API' });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
