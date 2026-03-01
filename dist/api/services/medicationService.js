"use strict";
/** src/api/services/medicationService.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicationService = exports.MedicationService = void 0;
const storage_1 = require("./storage");
const userService_1 = require("./userService");
const websocketService_1 = require("./websocketService");
class MedicationService {
    constructor() {
        this.storage = storage_1.storageService;
    }
    validateTime(time) {
        if (!/^\d{2}:\d{2}$/.test(time)) {
            return false;
        }
        const [hours, minutes] = time.split(':').map(Number);
        return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
    }
    validateFrequency(frequency) {
        return ['daily', 'every-2-days', 'weekly', 'bi-weekly', 'monthly', 'custom'].includes(frequency);
    }
    // Calculate next due date based on frequency
    calculateNextDue(lastTaken, frequency, customDays) {
        const next = new Date(lastTaken);
        switch (frequency) {
            case 'daily':
                next.setDate(next.getDate() + 1);
                break;
            case 'every-2-days':
                next.setDate(next.getDate() + 2);
                break;
            case 'weekly':
                next.setDate(next.getDate() + 7);
                break;
            case 'bi-weekly':
                next.setDate(next.getDate() + 14);
                break;
            case 'monthly':
                next.setMonth(next.getMonth() + 1);
                break;
            case 'custom':
                if (!customDays || customDays < 1) {
                    throw new Error('customDays is required and must be at least 1 for custom frequency');
                }
                next.setDate(next.getDate() + customDays);
                break;
        }
        return next;
    }
    // Check if medication is due based on frequency and last taken
    isMedicationDue(med, userTimezone) {
        const now = new Date();
        // For daily medications, check if already taken today
        if (med.frequency === 'daily') {
            return !med.taken;
        }
        // For non-daily medications (including custom), check nextDue date
        if (med.nextDue) {
            return now >= new Date(med.nextDue) && !med.taken;
        }
        // If no nextDue is set, it's due (first time)
        return !med.taken;
    }
    async createMedication(request) {
        const { uid, name, time, frequency, dose, amount, instructions } = request;
        let { customDays } = request;
        if (!name || !time || !frequency) {
            throw new Error('Name, time, and frequency are required');
        }
        if (!this.validateTime(time)) {
            throw new Error('Invalid time format. Use HH:MM (e.g., 09:00)');
        }
        if (!this.validateFrequency(frequency)) {
            throw new Error('Invalid frequency. Must be: daily, every-2-days, weekly, bi-weekly, monthly, or custom');
        }
        // 🔥 FIX: Validate customDays for custom frequency with better type checking
        if (frequency === 'custom') {
            // Convert to number if it's a string
            if (typeof customDays === 'string') {
                customDays = parseInt(customDays, 10);
            }
            // Now validate as a number
            if (customDays === undefined || customDays === null || isNaN(customDays) || customDays < 1) {
                throw new Error('customDays is required and must be at least 1 for custom frequency');
            }
            if (customDays > 365) {
                throw new Error('customDays cannot exceed 365 days');
            }
        }
        // Calculate initial nextDue for non-daily meds
        let nextDue;
        if (frequency !== 'daily') {
            nextDue = new Date();
            // Set to today at the specified time
            const [hours, minutes] = time.split(':').map(Number);
            nextDue.setHours(hours, minutes, 0, 0);
        }
        const medication = this.storage.addMedication(uid, {
            name,
            time,
            frequency,
            customDays: frequency === 'custom' ? customDays : undefined,
            dose,
            amount,
            instructions,
            nextDue
        });
        // Send WebSocket notification
        websocketService_1.websocketService.notifyUser(uid, {
            type: 'medication_added',
            uid,
            data: medication
        });
        return medication;
    }
    async getUserMedications(uid) {
        return this.storage.getUserMedications(uid);
    }
    async getMedication(uid, medName) {
        return this.storage.getMedication(uid, medName);
    }
    async updateMedication(uid, medName, updates) {
        // Validate time if provided
        if (updates.time && !this.validateTime(updates.time)) {
            throw new Error('Invalid time format. Use HH:MM (e.g., 09:00)');
        }
        // Validate frequency if provided
        if (updates.frequency && !this.validateFrequency(updates.frequency)) {
            throw new Error('Invalid frequency');
        }
        // 🔥 FIX: Validate customDays if frequency is custom with better type checking
        if (updates.frequency === 'custom') {
            let customDays = updates.customDays;
            // Convert to number if it's a string
            if (typeof customDays === 'string') {
                customDays = parseInt(customDays, 10);
            }
            // Now validate as a number
            if (customDays === undefined || customDays === null || isNaN(customDays) || customDays < 1) {
                throw new Error('customDays is required and must be at least 1 for custom frequency');
            }
            if (customDays > 365) {
                throw new Error('customDays cannot exceed 365 days');
            }
            // Update the value with the converted number
            updates.customDays = customDays;
        }
        const medication = this.storage.updateMedication(uid, medName, updates);
        if (!medication) {
            throw new Error('Medication not found');
        }
        // Send WebSocket notification
        websocketService_1.websocketService.notifyUser(uid, {
            type: 'medication_updated',
            uid,
            data: medication
        });
        return medication;
    }
    async deleteMedication(uid, medName) {
        const success = this.storage.removeMedication(uid, medName);
        if (!success) {
            throw new Error('Medication not found');
        }
        // Send WebSocket notification
        websocketService_1.websocketService.notifyUser(uid, {
            type: 'medication_deleted',
            uid,
            data: { name: medName }
        });
        return true;
    }
    async markTaken(uid, medName) {
        const med = this.storage.getMedication(uid, medName);
        if (!med) {
            throw new Error('Medication not found');
        }
        const now = new Date();
        const updates = {
            taken: true,
            lastTaken: now
        };
        // Calculate nextDue for non-daily medications
        if (med.frequency !== 'daily') {
            updates.nextDue = this.calculateNextDue(now, med.frequency, med.customDays);
        }
        const updatedMed = this.storage.updateMedication(uid, medName, updates);
        if (!updatedMed) {
            throw new Error('Failed to update medication');
        }
        // Send WebSocket notification
        websocketService_1.websocketService.notifyUser(uid, {
            type: 'medication_updated',
            uid,
            data: updatedMed
        });
        return true;
    }
    async markNotTaken(uid, medName) {
        const updatedMed = this.storage.updateMedication(uid, medName, { taken: false });
        if (!updatedMed) {
            throw new Error('Medication not found');
        }
        // Send WebSocket notification
        websocketService_1.websocketService.notifyUser(uid, {
            type: 'medication_updated',
            uid,
            data: updatedMed
        });
        return true;
    }
    async getMedicationsDueNow() {
        const now = new Date();
        const currentUTCHour = now.getUTCHours();
        const currentUTCMinute = now.getUTCMinutes();
        console.log(`🔍 Checking medications at UTC ${currentUTCHour.toString().padStart(2, '0')}:${currentUTCMinute.toString().padStart(2, '0')}`);
        const allMedications = this.storage.getAllUserMedications();
        const dueNow = [];
        for (const userMeds of allMedications) {
            // Get user timezone
            const user = userService_1.userService.getUser(userMeds.uid);
            if (!user) {
                console.log(`⚠️  No user found for UID: ${userMeds.uid}`);
                continue;
            }
            console.log(`👤 Checking ${userMeds.medications.length} medication(s) for user ${user.uid} (Timezone: ${user.timezone})`);
            for (const med of userMeds.medications) {
                // Skip if reminder already sent
                if (med.reminderSent) {
                    continue;
                }
                // Parse medication time
                const [medHour, medMinute] = med.time.split(':').map(Number);
                // Convert medication time from user's timezone to UTC (handles DST automatically)
                try {
                    // Step 1: Get today's date in the user's timezone
                    const formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: user.timezone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    });
                    const parts = formatter.formatToParts(now);
                    const tzYear = parseInt(parts.find(p => p.type === 'year').value);
                    const tzMonth = parseInt(parts.find(p => p.type === 'month').value) - 1; // JS months are 0-indexed
                    const tzDay = parseInt(parts.find(p => p.type === 'day').value);
                    // Step 2: Create ISO string for this date at the medication time
                    const isoDateString = `${tzYear}-${String(tzMonth + 1).padStart(2, '0')}-${String(tzDay).padStart(2, '0')}T${String(medHour).padStart(2, '0')}:${String(medMinute).padStart(2, '0')}:00`;
                    // Step 3: Calculate timezone offset
                    // Compare the same moment in time as represented in UTC vs the user's timezone
                    const testDate = new Date();
                    const utcMillis = Date.parse(testDate.toLocaleString('en-US', { timeZone: 'UTC' }));
                    const tzMillis = Date.parse(testDate.toLocaleString('en-US', { timeZone: user.timezone }));
                    const offsetMs = utcMillis - tzMillis;
                    // Step 4: Apply offset to convert from user's timezone to UTC
                    // If we interpret the medication time as UTC (asIfUTC), we need to adjust it
                    const asIfUTC = new Date(isoDateString + 'Z');
                    const medTimeUTC = new Date(asIfUTC.getTime() + offsetMs);
                    const utcHour = medTimeUTC.getUTCHours();
                    const utcMinute = medTimeUTC.getUTCMinutes();
                    // Calculate timezone offset to show in logs (helps with DST debugging)
                    // offsetMs is: (UTC time) - (TZ time)
                    // Negative offsetMs means TZ is ahead of UTC (e.g., BST is UTC+1, so -3600000ms)
                    // Positive offsetMs means TZ is behind UTC (e.g., EST is UTC-5, so +18000000ms)
                    const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
                    const offsetMins = Math.floor((Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60));
                    const offsetSign = offsetMs < 0 ? '+' : '-';
                    const offsetStr = `UTC${offsetSign}${offsetHours}${offsetMins > 0 ? ':' + String(offsetMins).padStart(2, '0') : ''}`;
                    const freqDisplay = med.frequency === 'custom' ? `custom (every ${med.customDays} days)` : med.frequency;
                    console.log(`  💊 ${med.name}: ${String(medHour).padStart(2, '0')}:${String(medMinute).padStart(2, '0')} ${user.timezone} (${offsetStr}) = ${utcHour.toString().padStart(2, '0')}:${utcMinute.toString().padStart(2, '0')} UTC | freq=${freqDisplay} | taken=${med.taken} | reminderSent=${med.reminderSent}`);
                    // Check if it's time for this medication
                    const isTimeMatch = utcHour === currentUTCHour && utcMinute === currentUTCMinute;
                    const isDue = this.isMedicationDue(med, user.timezone);
                    if (isTimeMatch && isDue) {
                        console.log(`  ✅ MATCH! Medication ${med.name} is due NOW`);
                        dueNow.push({ uid: userMeds.uid, medication: med, userTimezone: user.timezone });
                    }
                }
                catch (error) {
                    console.error(`  ❌ Error converting time for ${med.name}:`, error);
                }
            }
        }
        if (dueNow.length > 0) {
            console.log(`📬 Found ${dueNow.length} medication(s) due for reminders`);
        }
        return dueNow;
    }
    async resetDaily() {
        const allUsers = this.storage.getAllUserMedications();
        for (const { uid, medications } of allUsers) {
            for (const med of medications) {
                // Only reset daily medications
                if (med.frequency === 'daily') {
                    med.taken = false;
                    med.reminderSent = false;
                    med.updatedAt = new Date();
                }
                else {
                    // For non-daily meds (including custom), just reset reminderSent
                    med.reminderSent = false;
                    med.updatedAt = new Date();
                }
            }
            this.storage.saveUserMedications(uid, medications);
            // Send WebSocket notification for each user
            websocketService_1.websocketService.notifyUser(uid, {
                type: 'medication_updated',
                uid,
                data: { message: 'Daily reset completed' }
            });
        }
        console.log('✅ Daily medication status reset for all users');
    }
    async getAllUsers() {
        return this.storage.getAllUsers();
    }
}
exports.MedicationService = MedicationService;
exports.medicationService = new MedicationService();
