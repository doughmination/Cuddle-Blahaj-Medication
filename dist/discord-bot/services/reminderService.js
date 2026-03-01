"use strict";
/** src/discord-bot/services/reminderService.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMedicationReminder = sendMedicationReminder;
exports.sendFollowUpReminder = sendFollowUpReminder;
const discord_js_1 = require("discord.js");
const FREQUENCY_DISPLAY = {
    'daily': 'Daily',
    'every-2-days': 'Every 2 days',
    'weekly': 'Weekly',
    'bi-weekly': 'Bi-weekly',
    'monthly': 'Monthly',
    'custom': 'Custom'
};
// Helper function to get display text for frequency including custom
function getFrequencyDisplay(med) {
    if (med.frequency === 'custom' && med.customDays) {
        return `Every ${med.customDays} day${med.customDays > 1 ? 's' : ''}`;
    }
    return FREQUENCY_DISPLAY[med.frequency] || med.frequency;
}
async function sendMedicationReminder(client, discordId, med) {
    try {
        const user = await client.users.fetch(discordId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('💊 Medication Reminder')
            .setDescription(`It's time to take your medication: **${med.name}**`)
            .addFields({ name: 'Frequency', value: getFrequencyDisplay(med), inline: true }, { name: 'Time', value: med.time, inline: true });
        if (med.dose) {
            embed.addFields({ name: 'Dose', value: med.dose, inline: true });
        }
        if (med.amount) {
            embed.addFields({ name: 'Amount', value: med.amount, inline: true });
        }
        if (med.instructions) {
            embed.addFields({ name: 'Instructions', value: med.instructions });
        }
        embed.setTimestamp()
            .setFooter({ text: 'Click the button below once you\'ve taken it' });
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`take_med_${med.name}`)
            .setLabel('✓ Taken')
            .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
            .setCustomId(`skip_med_${med.name}`)
            .setLabel('Skip')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        await user.send({ embeds: [embed], components: [row] });
    }
    catch (err) {
        console.error(`Failed to send reminder to Discord user ${discordId}:`, err);
    }
}
async function sendFollowUpReminder(client, discordId, med) {
    try {
        const user = await client.users.fetch(discordId);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('⚠️ Medication Reminder (Follow-up)')
            .setDescription(`You haven't marked **${med.name}** as taken yet. Please remember to take it!`)
            .addFields({ name: 'Frequency', value: getFrequencyDisplay(med), inline: true });
        if (med.dose) {
            embed.addFields({ name: 'Dose', value: med.dose, inline: true });
        }
        if (med.amount) {
            embed.addFields({ name: 'Amount', value: med.amount, inline: true });
        }
        embed.setTimestamp()
            .setFooter({ text: 'This is a follow-up reminder' });
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`take_med_${med.name}`)
            .setLabel('✓ Taken')
            .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
            .setCustomId(`skip_med_${med.name}`)
            .setLabel('Skip')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        await user.send({ embeds: [embed], components: [row] });
    }
    catch (err) {
        console.error(`Failed to send follow-up to Discord user ${discordId}:`, err);
    }
}
