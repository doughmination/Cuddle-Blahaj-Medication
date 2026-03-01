"use strict";
/** src/discord-bot/services/scheduler.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupScheduler = setupScheduler;
const node_schedule_1 = __importDefault(require("node-schedule"));
const apiClient_1 = require("./apiClient");
const reminderService_1 = require("./reminderService");
const interactionHandler_1 = require("../handlers/interactionHandler");
function setupScheduler(client) {
    // Check every minute for medications that need reminders
    node_schedule_1.default.scheduleJob('* * * * *', () => {
        checkMedicationReminders(client);
    });
    // Reset taken status at midnight UTC
    node_schedule_1.default.scheduleJob('0 0 * * *', async () => {
        try {
            await apiClient_1.apiClient.resetDailyMedications();
            console.log('✅ Daily medication status reset');
        }
        catch (error) {
            console.error('❌ Error resetting daily medications:', error);
        }
    });
    console.log('✅ Medication scheduler initialized');
    console.log('ℹ️  Checking medications every minute');
    console.log('ℹ️  Daily reset at midnight UTC');
}
async function checkMedicationReminders(client) {
    try {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentMinute = now.getUTCMinutes();
        console.log(`🕐 [${now.toISOString()}] Checking medications (UTC ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')})`);
        const dueMedications = await apiClient_1.apiClient.getMedicationsDueNow();
        if (dueMedications.length > 0) {
            console.log(`📋 Found ${dueMedications.length} medication(s) due for reminders`);
        }
        for (const { uid, medication, userTimezone } of dueMedications) {
            // Get user info to find Discord ID
            try {
                const user = await apiClient_1.apiClient.getUser(uid);
                // Only send Discord reminders if user has linked Discord
                if (!user.discordId) {
                    console.log(`⚠️  User ${uid} has no Discord ID linked, skipping Discord reminder`);
                    // Mark reminder as sent so we don't keep trying
                    await apiClient_1.apiClient.updateMedication(uid, medication.name, {
                        reminderSent: true
                    });
                    continue;
                }
                console.log(`📤 Sending reminder to ${user.discordId} for ${medication.name} (Timezone: ${userTimezone})`);
                // Send initial reminder via Discord
                await (0, reminderService_1.sendMedicationReminder)(client, user.discordId, medication);
                // Mark reminder as sent via API
                try {
                    await apiClient_1.apiClient.updateMedication(uid, medication.name, {
                        reminderSent: true
                    });
                    console.log(`✅ Marked ${medication.name} reminder as sent for user ${uid}`);
                }
                catch (error) {
                    console.error(`❌ Failed to update reminder status for ${medication.name}:`, error);
                }
                // Schedule follow-up reminder in 1 hour if not taken
                const reminderId = `${uid}-${medication.name}`;
                const timeout = setTimeout(async () => {
                    try {
                        // Check if medication has been taken
                        const currentMed = await apiClient_1.apiClient.getMedication(uid, medication.name);
                        if (!currentMed.taken && user.discordId) {
                            console.log(`📤 Sending follow-up reminder for ${medication.name} to user ${uid}`);
                            await (0, reminderService_1.sendFollowUpReminder)(client, user.discordId, medication);
                        }
                        else {
                            console.log(`ℹ️  Skipping follow-up for ${medication.name} - already taken`);
                        }
                    }
                    catch (error) {
                        console.error(`❌ Failed to send follow-up for ${medication.name}:`, error);
                    }
                }, 60 * 60 * 1000); // 1 hour
                (0, interactionHandler_1.setPendingReminder)(reminderId, timeout);
            }
            catch (error) {
                console.error(`❌ Failed to get user info for uid ${uid}:`, error);
            }
        }
    }
    catch (error) {
        console.error('❌ Error checking medication reminders:', error);
    }
}
