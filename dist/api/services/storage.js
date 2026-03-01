"use strict";
/** src/api/services/storage.ts
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
exports.storageService = exports.StorageService = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class StorageService {
    constructor(dataPath) {
        const baseDir = dataPath || path.join(process.cwd(), 'data');
        // Ensure data directory exists
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        const dbPath = path.join(baseDir, 'medications.db');
        this.db = new better_sqlite3_1.default(dbPath);
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        // Initialize database schema
        this.initializeSchema();
        console.log('✅ SQLite database initialized');
    }
    initializeSchema() {
        const schemaPath = path.join(__dirname, '../../schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf-8');
            this.db.exec(schema);
        }
        else {
            // Inline schema if file doesn't exist
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          uid VARCHAR(255) PRIMARY KEY,
          discord_id VARCHAR(255) UNIQUE,
          timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_via VARCHAR(20) NOT NULL CHECK (created_via IN ('discord', 'pwa')),
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);

        CREATE TABLE IF NOT EXISTS sessions (
          token VARCHAR(255) PRIMARY KEY,
          uid VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_uid ON sessions(uid);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

        CREATE TABLE IF NOT EXISTS medications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          time VARCHAR(5) NOT NULL,
          frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'every-2-days', 'weekly', 'bi-weekly', 'monthly', 'custom')),
          custom_days INTEGER,
          dose VARCHAR(255),
          amount VARCHAR(255),
          instructions TEXT,
          taken BOOLEAN NOT NULL DEFAULT 0,
          reminder_sent BOOLEAN NOT NULL DEFAULT 0,
          last_taken TIMESTAMP,
          next_due TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
          UNIQUE(uid, name),
          CHECK (frequency != 'custom' OR custom_days IS NOT NULL),
          CHECK (custom_days IS NULL OR (custom_days >= 1 AND custom_days <= 365))
        );

        CREATE INDEX IF NOT EXISTS idx_medications_uid ON medications(uid);
        CREATE INDEX IF NOT EXISTS idx_medications_uid_name ON medications(uid, name);
      `);
        }
    }
    dbToMedication(row) {
        return {
            name: row.name,
            time: row.time,
            frequency: row.frequency,
            customDays: row.custom_days || undefined,
            dose: row.dose || undefined,
            amount: row.amount || undefined,
            instructions: row.instructions || undefined,
            taken: row.taken === 1,
            reminderSent: row.reminder_sent === 1,
            lastTaken: row.last_taken ? new Date(row.last_taken) : undefined,
            nextDue: row.next_due ? new Date(row.next_due) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
    getUserMedications(uid) {
        const stmt = this.db.prepare(`
      SELECT * FROM medications 
      WHERE uid = ? 
      ORDER BY time ASC
    `);
        const rows = stmt.all(uid);
        return rows.map(row => this.dbToMedication(row));
    }
    getMedication(uid, medName) {
        const stmt = this.db.prepare(`
      SELECT * FROM medications 
      WHERE uid = ? AND name = ?
    `);
        const row = stmt.get(uid, medName);
        return row ? this.dbToMedication(row) : null;
    }
    addMedication(uid, medication) {
        const stmt = this.db.prepare(`
      INSERT INTO medications (
        uid, name, time, frequency, custom_days, dose, amount, instructions,
        last_taken, next_due
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        try {
            stmt.run(uid, medication.name, medication.time, medication.frequency, medication.customDays || null, medication.dose || null, medication.amount || null, medication.instructions || null, medication.lastTaken ? medication.lastTaken.toISOString() : null, medication.nextDue ? medication.nextDue.toISOString() : null);
            const created = this.getMedication(uid, medication.name);
            if (!created) {
                throw new Error('Failed to retrieve created medication');
            }
            return created;
        }
        catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT') {
                throw new Error(`Medication "${medication.name}" already exists for this user`);
            }
            throw error;
        }
    }
    updateMedication(uid, medName, updates) {
        // First check if medication exists
        const existing = this.getMedication(uid, medName);
        if (!existing)
            return null;
        // Build dynamic update query
        const fields = [];
        const values = [];
        if (updates.time !== undefined) {
            fields.push('time = ?');
            values.push(updates.time);
        }
        if (updates.frequency !== undefined) {
            fields.push('frequency = ?');
            values.push(updates.frequency);
        }
        if (updates.customDays !== undefined) {
            fields.push('custom_days = ?');
            values.push(updates.customDays || null);
        }
        if (updates.dose !== undefined) {
            fields.push('dose = ?');
            values.push(updates.dose || null);
        }
        if (updates.amount !== undefined) {
            fields.push('amount = ?');
            values.push(updates.amount || null);
        }
        if (updates.instructions !== undefined) {
            fields.push('instructions = ?');
            values.push(updates.instructions || null);
        }
        if (updates.taken !== undefined) {
            fields.push('taken = ?');
            values.push(updates.taken ? 1 : 0);
        }
        if (updates.reminderSent !== undefined) {
            fields.push('reminder_sent = ?');
            values.push(updates.reminderSent ? 1 : 0);
        }
        if (updates.lastTaken !== undefined) {
            fields.push('last_taken = ?');
            values.push(updates.lastTaken ? updates.lastTaken.toISOString() : null);
        }
        if (updates.nextDue !== undefined) {
            fields.push('next_due = ?');
            values.push(updates.nextDue ? updates.nextDue.toISOString() : null);
        }
        if (fields.length === 0) {
            return existing; // No updates
        }
        // Add WHERE clause values
        values.push(uid, medName);
        const stmt = this.db.prepare(`
      UPDATE medications 
      SET ${fields.join(', ')}
      WHERE uid = ? AND name = ?
    `);
        stmt.run(...values);
        return this.getMedication(uid, medName);
    }
    removeMedication(uid, medName) {
        const stmt = this.db.prepare(`
      DELETE FROM medications 
      WHERE uid = ? AND name = ?
    `);
        const result = stmt.run(uid, medName);
        return result.changes > 0;
    }
    getAllUserMedications() {
        const stmt = this.db.prepare(`
      SELECT DISTINCT uid FROM medications
    `);
        const uids = stmt.all();
        return uids.map(({ uid }) => ({
            uid,
            medications: this.getUserMedications(uid)
        }));
    }
    resetDailyMedications() {
        // Reset daily medications
        const dailyStmt = this.db.prepare(`
      UPDATE medications 
      SET taken = 0, reminder_sent = 0
      WHERE frequency = 'daily'
    `);
        dailyStmt.run();
        // Reset reminder_sent for non-daily medications
        const nonDailyStmt = this.db.prepare(`
      UPDATE medications 
      SET reminder_sent = 0
      WHERE frequency != 'daily'
    `);
        nonDailyStmt.run();
        console.log('✅ Daily medication status reset');
    }
    getAllUsers() {
        const stmt = this.db.prepare(`
      SELECT DISTINCT uid FROM medications
    `);
        const rows = stmt.all();
        return rows.map(row => row.uid);
    }
    deleteUserMedications(uid) {
        const stmt = this.db.prepare(`
      DELETE FROM medications WHERE uid = ?
    `);
        const result = stmt.run(uid);
        return result.changes > 0;
    }
    // Utility method to save (not used in SQL, kept for compatibility)
    saveUserMedications(uid, medications) {
        // This is a no-op for SQL since we update directly
        // Kept for backward compatibility with the interface
    }
    // Close database connection (useful for testing)
    close() {
        this.db.close();
    }
}
exports.StorageService = StorageService;
// Singleton instance
exports.storageService = new StorageService();
