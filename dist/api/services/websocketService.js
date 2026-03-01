"use strict";
/** src/api/services/websocketService.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketService = void 0;
const ws_1 = require("ws");
const userService_1 = require("./userService");
class WebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map();
    }
    initialize(server) {
        this.wss = new ws_1.WebSocketServer({
            server,
            path: '/ws'
        });
        this.wss.on('connection', (ws, req) => {
            console.log('🔌 New WebSocket connection');
            // Extract session token from query string or cookie
            const url = new URL(req.url, `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            if (!token) {
                console.log('❌ No token provided, closing connection');
                ws.close(1008, 'Authentication required');
                return;
            }
            // Validate session
            const uid = userService_1.userService.validateSessionToken(token);
            if (!uid) {
                console.log('❌ Invalid token, closing connection');
                ws.close(1008, 'Invalid authentication');
                return;
            }
            console.log(`✅ Authenticated WebSocket for user ${uid}`);
            // Store client connection
            if (!this.clients.has(uid)) {
                this.clients.set(uid, new Set());
            }
            this.clients.get(uid).add(ws);
            // Send initial connection success message
            ws.send(JSON.stringify({
                type: 'connected',
                uid,
                timestamp: new Date().toISOString()
            }));
            // Handle messages from client (ping/pong)
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    if (data.type === 'ping') {
                        ws.send(JSON.stringify({ type: 'pong' }));
                    }
                }
                catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });
            // Handle client disconnect
            ws.on('close', () => {
                console.log(`🔌 WebSocket disconnected for user ${uid}`);
                const userClients = this.clients.get(uid);
                if (userClients) {
                    userClients.delete(ws);
                    if (userClients.size === 0) {
                        this.clients.delete(uid);
                    }
                }
            });
            // Handle errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });
        console.log('✅ WebSocket server initialized on path /ws');
    }
    // Notify specific user about medication changes
    notifyUser(uid, message) {
        const userClients = this.clients.get(uid);
        if (!userClients || userClients.size === 0) {
            return;
        }
        const messageStr = JSON.stringify(message);
        userClients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
        console.log(`📢 Notified ${userClients.size} client(s) for user ${uid}`);
    }
    // Broadcast to all connected users (useful for system messages)
    broadcast(message) {
        if (!this.wss)
            return;
        const messageStr = JSON.stringify(message);
        this.wss.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }
    // Get connection count for a user
    getUserConnectionCount(uid) {
        return this.clients.get(uid)?.size || 0;
    }
    // Get total connection count
    getTotalConnections() {
        return Array.from(this.clients.values())
            .reduce((sum, clients) => sum + clients.size, 0);
    }
}
exports.websocketService = new WebSocketService();
