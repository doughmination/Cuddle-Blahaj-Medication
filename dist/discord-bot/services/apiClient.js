"use strict";
/** src/discord-bot/services/apiClient.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.ApiClient = void 0;
class ApiClient {
    constructor() {
        this.baseUrl = process.env.API_URL || 'http://localhost:3000/api';
    }
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'API request failed');
            }
            return data.data;
        }
        catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }
    // ========== USER MANAGEMENT ==========
    async getOrCreateUser(discordId) {
        try {
            const user = await this.request(`/users/discord/${discordId}`);
            return user;
        }
        catch (error) {
            return this.createUser(discordId);
        }
    }
    async createUser(discordId, timezone) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify({
                createdVia: 'discord',
                discordId,
                timezone
            }),
        });
    }
    async getUserByDiscordId(discordId) {
        return this.request(`/users/discord/${discordId}`);
    }
    async getUser(uid) {
        return this.request(`/users/${uid}`);
    }
    async updateUserTimezone(uid, timezone) {
        return this.request(`/users/${uid}/settings`, {
            method: 'PATCH',
            body: JSON.stringify({ timezone }),
        });
    }
    async linkDiscordToUser(uid, discordId) {
        return this.request(`/users/${uid}/link-discord`, {
            method: 'POST',
            body: JSON.stringify({ discordId }),
        });
    }
    // ========== MEDICATION MANAGEMENT ==========
    async getUserMedications(uid) {
        return this.request(`/medications/${uid}`);
    }
    async getMedication(uid, medName) {
        return this.request(`/medications/${uid}/${encodeURIComponent(medName)}`);
    }
    async createMedication(uid, medication) {
        return this.request(`/medications/${uid}`, {
            method: 'POST',
            body: JSON.stringify(medication),
        });
    }
    async updateMedication(uid, medName, updates) {
        return this.request(`/medications/${uid}/${encodeURIComponent(medName)}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    }
    async deleteMedication(uid, medName) {
        await this.request(`/medications/${uid}/${encodeURIComponent(medName)}`, {
            method: 'DELETE',
        });
    }
    async markMedicationTaken(uid, medName) {
        await this.request(`/medications/${uid}/${encodeURIComponent(medName)}/taken`, {
            method: 'POST',
        });
    }
    async markMedicationNotTaken(uid, medName) {
        await this.request(`/medications/${uid}/${encodeURIComponent(medName)}/not-taken`, {
            method: 'POST',
        });
    }
    async getMedicationsDueNow() {
        return this.request('/medications/due');
    }
    async resetDailyMedications() {
        await this.request('/medications/reset-daily', {
            method: 'POST',
        });
    }
}
exports.ApiClient = ApiClient;
exports.apiClient = new ApiClient();
