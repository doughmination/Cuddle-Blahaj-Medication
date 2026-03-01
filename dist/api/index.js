"use strict";
/** src/api/index.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
// Load environment variables FIRST before importing anything else
dotenv.config();
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = require("http");
const errorHandler_1 = require("./middleware/errorHandler");
const medicationRoutes_1 = require("./routes/medicationRoutes");
const userRoutes_1 = require("./routes/userRoutes");
const authRoutes_1 = require("./routes/authRoutes");
const websocketService_1 = require("./services/websocketService");
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const server = (0, http_1.createServer)(app);
const PORT = process.env.API_PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
// Initialize WebSocket server FIRST (before any routes)
websocketService_1.websocketService.initialize(server);
// Middleware
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// ✅ Fixed CORS middleware (works in both dev + production)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Always define allowed origin explicitly
    const allowedOrigin = process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL || "https://www.cuddle-blahaj.win"
        : origin || "http://localhost:5173";
    res.header("Access-Control-Allow-Origin", allowedOrigin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true"); // ✅ allow cookies always
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }
    next();
});
// Health check - MUST be before static files!
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        websocket: {
            active: true,
            totalConnections: websocketService_1.websocketService.getTotalConnections()
        }
    });
});
// API routes - MUST be before static files!
app.use('/api/auth', authRoutes_1.authRouter);
app.use('/api/users', userRoutes_1.userRouter);
app.use('/api/medications', medicationRoutes_1.medicationRouter);
// Serve PWA static files in production - AFTER API routes!
if (process.env.NODE_ENV === 'production') {
    const pwaPath = path.join(__dirname, '../pwa');
    app.use(express_1.default.static(pwaPath));
    // Serve PWA for any non-API, non-WebSocket routes (SPA fallback)
    // CRITICAL: Exclude /ws from catch-all to allow WebSocket upgrades
    app.get('*', (req, res, next) => {
        // Skip WebSocket path - let it be handled by WebSocketServer
        if (req.path === '/ws') {
            return next();
        }
        res.sendFile(path.join(pwaPath, 'index.html'));
    });
}
// Error handling
app.use(errorHandler_1.errorHandler);
// Start server
server.listen(PORT, () => {
    console.log(`✅ API server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws`);
    console.log(`🔐 OAuth callback: ${process.env.DISCORD_REDIRECT_URI}`);
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
        console.error('⚠️  WARNING: Discord credentials not found in environment variables!');
    }
    else {
        console.log(`✅ Discord OAuth configured`);
    }
    if (process.env.NODE_ENV === 'production') {
        console.log(`🌐 PWA available at: http://localhost:${PORT}`);
    }
});
exports.default = app;
