"use strict";
/** src/discord-bot/commands/register.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const discord_js_1 = require("discord.js");
const commands = [
    // Main /med command with subcommands
    new discord_js_1.SlashCommandBuilder()
        .setName('med')
        .setDescription('Manage your medications')
        .addSubcommand(subcommand => subcommand
        .setName('add')
        .setDescription('Add a new medication reminder')
        .addStringOption(option => option
        .setName('name')
        .setDescription('Name of the medication')
        .setRequired(true))
        .addStringOption(option => option
        .setName('time')
        .setDescription('Time to take medication (HH:MM format, e.g., 09:00)')
        .setRequired(true))
        .addStringOption(option => option
        .setName('frequency')
        .setDescription('How often to take this medication')
        .setRequired(true)
        .addChoices({ name: 'Daily', value: 'daily' }, { name: 'Every 2 Days', value: 'every-2-days' }, { name: 'Weekly', value: 'weekly' }, { name: 'Bi-weekly (Every 2 weeks)', value: 'bi-weekly' }, { name: 'Monthly', value: 'monthly' }, { name: 'Custom (specify days)', value: 'custom' }))
        .addIntegerOption(option => option
        .setName('custom_days')
        .setDescription('For custom frequency: number of days between doses (e.g., 10 for every 10 days)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(365))
        .addStringOption(option => option
        .setName('dose')
        .setDescription('Dose amount (e.g., "10mg", "2 tablets")')
        .setRequired(false))
        .addStringOption(option => option
        .setName('amount')
        .setDescription('Amount to take (e.g., "1 pill", "5ml")')
        .setRequired(false))
        .addStringOption(option => option
        .setName('instructions')
        .setDescription('Special instructions (e.g., "Take with food")')
        .setRequired(false)))
        .addSubcommand(subcommand => subcommand
        .setName('list')
        .setDescription('List all your scheduled medications'))
        .addSubcommand(subcommand => subcommand
        .setName('edit')
        .setDescription('Edit an existing medication')
        .addStringOption(option => option
        .setName('name')
        .setDescription('Name of the medication to edit')
        .setRequired(true)
        .setAutocomplete(true) // Enable autocomplete
    )
        .addStringOption(option => option
        .setName('time')
        .setDescription('New time (HH:MM format)')
        .setRequired(false))
        .addStringOption(option => option
        .setName('frequency')
        .setDescription('New frequency')
        .setRequired(false)
        .addChoices({ name: 'Daily', value: 'daily' }, { name: 'Every 2 Days', value: 'every-2-days' }, { name: 'Weekly', value: 'weekly' }, { name: 'Bi-weekly', value: 'bi-weekly' }, { name: 'Monthly', value: 'monthly' }, { name: 'Custom (specify days)', value: 'custom' }))
        .addIntegerOption(option => option
        .setName('custom_days')
        .setDescription('For custom frequency: number of days between doses')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(365))
        .addStringOption(option => option
        .setName('dose')
        .setDescription('New dose amount')
        .setRequired(false))
        .addStringOption(option => option
        .setName('amount')
        .setDescription('New amount to take')
        .setRequired(false))
        .addStringOption(option => option
        .setName('instructions')
        .setDescription('New instructions')
        .setRequired(false)))
        .addSubcommand(subcommand => subcommand
        .setName('remove')
        .setDescription('Remove a medication reminder')
        .addStringOption(option => option
        .setName('name')
        .setDescription('Name of the medication to remove')
        .setRequired(true)
        .setAutocomplete(true) // Enable autocomplete
    ))
        .setDMPermission(true)
        .setDefaultMemberPermissions(null),
    // /dashboard command
    new discord_js_1.SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Open the web dashboard to manage your medications')
        .setDMPermission(true)
        .setDefaultMemberPermissions(null),
    // /support command
    new discord_js_1.SlashCommandBuilder()
        .setName('support')
        .setDescription('Get an invite link to the support server')
        .setDMPermission(true)
        .setDefaultMemberPermissions(null),
    // /invite command
    new discord_js_1.SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get an invite link to add the bot to your server')
        .setDMPermission(true)
        .setDefaultMemberPermissions(null),
    // /ping command
    new discord_js_1.SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s responsiveness')
        .setDMPermission(true)
        .setDefaultMemberPermissions(null),
    // /version command
    new discord_js_1.SlashCommandBuilder()
        .setName('version')
        .setDescription('Show the current version of the medication bot')
        .setDMPermission(true)
        .setDefaultMemberPermissions(null),
    // /timezone command
    new discord_js_1.SlashCommandBuilder()
        .setName('timezone')
        .setDescription('Set your timezone for accurate reminders')
        .addStringOption(option => option
        .setName('timezone')
        .setDescription('Your timezone (e.g., America/New_York, Europe/London)')
        .setRequired(true)
        .setAutocomplete(true))
        .setDMPermission(true)
        .setDefaultMemberPermissions(null),
    // /help command
    new discord_js_1.SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information about the medication bot')
        .setDMPermission(true)
        .setDefaultMemberPermissions(null),
].map(command => {
    const json = command.toJSON();
    // Set integration types for user-installable app
    json.integration_types = [0, 1];
    json.contexts = [0, 1, 2];
    return json;
});
async function registerCommands(client) {
    try {
        const rest = new discord_js_1.REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        console.log('Started refreshing application (/) commands with custom frequency support.');
        await rest.put(discord_js_1.Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Successfully registered commands with custom frequency support.');
        console.log('ℹ️  Integration Types: GUILD_INSTALL (0), USER_INSTALL (1)');
        console.log('ℹ️  Contexts: GUILD (0), BOT_DM (1), PRIVATE_CHANNEL (2)');
    }
    catch (error) {
        console.error('Error registering commands:', error);
    }
}
