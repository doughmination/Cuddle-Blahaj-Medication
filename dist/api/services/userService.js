"use strict";
/** src/api/services/userService.ts
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
exports.userService = exports.UserService = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
class UserService {
    constructor(dataPath) {
        const baseDir = dataPath || path.join(process.cwd(), 'data');
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        const dbPath = path.join(baseDir, 'medications.db');
        this.db = new better_sqlite3_1.default(dbPath);
        this.db.pragma('foreign_keys = ON');
        console.log('✅ User service initialized with SQL database');
    }
    dbToUser(row) {
        return {
            uid: row.uid,
            discordId: row.discord_id,
            timezone: row.timezone,
            createdAt: new Date(row.created_at),
            createdVia: row.created_via
        };
    }
    generateUid() {
        return `uid_${(0, crypto_1.randomBytes)(8).toString('hex')}`;
    }
    validateTimezone(timezone) {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    createUser(createdVia, discordId, timezone) {
        const uid = this.generateUid();
        let userTimezone = timezone || 'UTC';
        if (!this.validateTimezone(userTimezone)) {
            console.warn(`Invalid timezone ${userTimezone}, defaulting to UTC`);
            userTimezone = 'UTC';
        }
        const stmt = this.db.prepare(`
      INSERT INTO users (uid, discord_id, timezone, created_via)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(uid, discordId || null, userTimezone, createdVia);
        const user = this.getUser(uid);
        if (!user) {
            throw new Error('Failed to create user');
        }
        return user;
    }
    updateUser(uid, updates) {
        const user = this.getUser(uid);
        if (!user)
            return null;
        if (updates.timezone) {
            if (!this.validateTimezone(updates.timezone)) {
                throw new Error('Invalid timezone');
            }
            const stmt = this.db.prepare(`
        UPDATE users SET timezone = ? WHERE uid = ?
      `);
            stmt.run(updates.timezone, uid);
        }
        return this.getUser(uid);
    }
    getUser(uid) {
        const stmt = this.db.prepare(`
      SELECT * FROM users WHERE uid = ?
    `);
        const row = stmt.get(uid);
        return row ? this.dbToUser(row) : null;
    }
    getUserByDiscordId(discordId) {
        const stmt = this.db.prepare(`
      SELECT * FROM users WHERE discord_id = ?
    `);
        const row = stmt.get(discordId);
        return row ? this.dbToUser(row) : null;
    }
    getAllUsers() {
        const stmt = this.db.prepare(`
      SELECT * FROM users ORDER BY created_at DESC
    `);
        const rows = stmt.all();
        return rows.map(row => this.dbToUser(row));
    }
    linkDiscordToUser(uid, discordId) {
        const user = this.getUser(uid);
        if (!user)
            return null;
        const existingUser = this.getUserByDiscordId(discordId);
        if (existingUser && existingUser.uid !== uid) {
            throw new Error('Discord ID already linked to another account');
        }
        const stmt = this.db.prepare(`
      UPDATE users SET discord_id = ? WHERE uid = ?
    `);
        stmt.run(discordId, uid);
        return this.getUser(uid);
    }
    generateSessionToken(uid) {
        const user = this.getUser(uid);
        if (!user) {
            throw new Error('User not found');
        }
        this.cleanExpiredSessions();
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
        const stmt = this.db.prepare(`
      INSERT INTO sessions (token, uid, expires_at)
      VALUES (?, ?, ?)
    `);
        stmt.run(token, uid, expiresAt.toISOString());
        return token;
    }
    validateSessionToken(token) {
        this.cleanExpiredSessions();
        const stmt = this.db.prepare(`
      SELECT uid FROM sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `);
        const row = stmt.get(token);
        return row ? row.uid : null;
    }
    revokeSessionToken(token) {
        const stmt = this.db.prepare(`
      DELETE FROM sessions WHERE token = ?
    `);
        const result = stmt.run(token);
        return result.changes > 0;
    }
    cleanExpiredSessions() {
        const stmt = this.db.prepare(`
      DELETE FROM sessions WHERE expires_at <= datetime('now')
    `);
        stmt.run();
    }
    deleteUser(uid) {
        // This will cascade delete medications and sessions due to foreign keys
        const stmt = this.db.prepare(`
      DELETE FROM users WHERE uid = ?
    `);
        const result = stmt.run(uid);
        return result.changes > 0;
    }
    // Utility method to close database (useful for testing)
    close() {
        this.db.close();
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
