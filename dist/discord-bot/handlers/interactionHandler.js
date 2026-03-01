"use strict";
/** src/discord-bot/handlers/interactionHandler.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInteraction = handleInteraction;
exports.setPendingReminder = setPendingReminder;
exports.cancelPendingReminder = cancelPendingReminder;
const discord_js_1 = require("discord.js");
const apiClient_1 = require("../services/apiClient");
const errorService_1 = require("../services/errorService");
const commandHandlers_1 = require("../commands/commandHandlers");
const pendingReminders = new Map();
// List of common timezones for autocomplete
const TIMEZONE_OPTIONS = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'America/Toronto',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Athens',
    'Europe/Moscow',
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Bangkok',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Singapore',
    'Asia/Hong_Kong',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Perth',
    'Pacific/Auckland',
    'UTC'
];
// Helper function to create error embed
function createErrorEmbed(errorMessage, errorHash) {
    return new discord_js_1.EmbedBuilder()
        .setColor(0xED4245) // Red color for errors
        .setTitle('❌ Error')
        .setDescription(errorMessage)
        .setFooter({ text: `Error: ${errorHash}` })
        .setTimestamp();
}
async function handleInteraction(interaction, client) {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction);
        return;
    }
    // Handle slash command interactions
    if (interaction.isChatInputCommand()) {
        try {
            switch (interaction.commandName) {
                case 'med':
                    await (0, commandHandlers_1.handleMedCommand)(interaction);
                    break;
                case 'dashboard':
                    await (0, commandHandlers_1.handleDashboard)(interaction);
                    break;
                case 'timezone':
                    await (0, commandHandlers_1.handleTimezone)(interaction);
                    break;
                case 'help':
                    await (0, commandHandlers_1.handleHelp)(interaction);
                    break;
                case 'support':
                    await (0, commandHandlers_1.handleSupport)(interaction);
                    break;
                case 'invite':
                    await (0, commandHandlers_1.handleInvite)(interaction);
                    break;
                case 'version':
                    await (0, commandHandlers_1.handleVersion)(interaction);
                    break;
                case 'ping':
                    await (0, commandHandlers_1.handlePing)(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown command',
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
            }
        }
        catch (error) {
            console.error('Error handling command:', error);
            // Log the error with hash
            const errorHash = errorService_1.errorService.logError(interaction, error, { commandName: interaction.commandName });
            const errorEmbed = createErrorEmbed('An error occurred while processing your command.', errorHash);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    embeds: [errorEmbed],
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
            }
            else {
                await interaction.reply({
                    embeds: [errorEmbed],
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
            }
        }
    }
    // Handle button interactions
    if (interaction.isButton()) {
        try {
            await handleButtonInteraction(interaction);
        }
        catch (error) {
            console.error('Error handling button:', error);
            // Log the error with hash
            const errorHash = errorService_1.errorService.logError(interaction, error, {
                buttonId: interaction.customId,
                messageId: interaction.message.id
            });
            const errorEmbed = createErrorEmbed('An error occurred while processing your action.', errorHash);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    embeds: [errorEmbed],
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
            }
            else {
                await interaction.reply({
                    embeds: [errorEmbed],
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
            }
        }
    }
}
async function handleAutocomplete(interaction) {
    try {
        const commandName = interaction.commandName;
        const focusedOption = interaction.options.getFocused(true);
        // Handle /med edit and /med remove autocomplete
        if (commandName === 'med' && focusedOption.name === 'name') {
            const discordId = interaction.user.id;
            const user = await apiClient_1.apiClient.getUserByDiscordId(discordId);
            if (!user) {
                await interaction.respond([]);
                return;
            }
            // Get user's medications
            const medications = await apiClient_1.apiClient.getUserMedications(user.uid);
            // Filter medications based on what the user has typed
            const focusedValue = focusedOption.value.toLowerCase();
            const filtered = medications
                .filter(med => med.name.toLowerCase().includes(focusedValue))
                .slice(0, 25); // Discord limits to 25 choices
            // Return autocomplete choices
            await interaction.respond(filtered.map(med => ({
                name: `${med.name} (${med.time} - ${med.frequency})`,
                value: med.name
            })));
            return;
        }
        // Handle /timezone autocomplete
        if (commandName === 'timezone' && focusedOption.name === 'timezone') {
            const focusedValue = focusedOption.value.toLowerCase();
            // Filter timezones based on what the user has typed
            const filtered = TIMEZONE_OPTIONS
                .filter(tz => tz.toLowerCase().includes(focusedValue))
                .slice(0, 25); // Discord limits to 25 choices
            // Return autocomplete choices with friendly names
            await interaction.respond(filtered.map(tz => {
                // Create a friendly display name
                const displayName = tz.replace(/_/g, ' ');
                return {
                    name: displayName,
                    value: tz
                };
            }));
            return;
        }
        // Default: respond with empty array for unknown autocomplete
        await interaction.respond([]);
    }
    catch (error) {
        console.error('Error handling autocomplete:', error);
        // Always respond to autocomplete, even if empty
        await interaction.respond([]);
    }
}
async function handleButtonInteraction(interaction) {
    if (!interaction.isButton())
        return;
    const discordId = interaction.user.id;
    const [action, , medName] = interaction.customId.split('_');
    if (action === 'take') {
        try {
            const user = await apiClient_1.apiClient.getUserByDiscordId(discordId);
            await apiClient_1.apiClient.markMedicationTaken(user.uid, medName);
            const reminderId = `${user.uid}-${medName}`;
            cancelPendingReminder(reminderId);
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('✅ Medication Taken')
                .setDescription(`Great! You've marked **${medName}** as taken.`)
                .setTimestamp();
            await interaction.update({ embeds: [embed], components: [] });
        }
        catch (error) {
            const errorHash = errorService_1.errorService.logError(interaction, error, { action: 'take', medName });
            const errorEmbed = createErrorEmbed('Could not find this medication in your list.', errorHash);
            await interaction.reply({
                embeds: [errorEmbed],
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
    }
    else if (action === 'skip') {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('⏭️ Medication Skipped')
            .setDescription(`You've skipped **${medName}**. Remember to take it when you can!`)
            .setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
    }
}
function setPendingReminder(reminderId, timeout) {
    pendingReminders.set(reminderId, timeout);
}
function cancelPendingReminder(reminderId) {
    const timeout = pendingReminders.get(reminderId);
    if (timeout) {
        clearTimeout(timeout);
        pendingReminders.delete(reminderId);
        return true;
    }
    return false;
}
