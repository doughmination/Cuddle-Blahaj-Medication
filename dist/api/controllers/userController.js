"use strict";
/** src/api/controllers/userController.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = exports.UserController = void 0;
const userService_1 = require("../services/userService");
class UserController {
    async createUser(req, res, next) {
        try {
            const { createdVia, discordId, timezone } = req.body;
            if (!createdVia || !['discord', 'pwa'].includes(createdVia)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid createdVia value. Must be "discord" or "pwa"'
                });
                return;
            }
            if (discordId) {
                const existing = userService_1.userService.getUserByDiscordId(discordId);
                if (existing) {
                    res.status(400).json({
                        success: false,
                        error: 'Discord ID already registered'
                    });
                    return;
                }
            }
            const user = userService_1.userService.createUser(createdVia, discordId, timezone);
            const response = {
                success: true,
                data: user,
                message: 'User created successfully'
            };
            res.status(201).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getUser(req, res, next) {
        try {
            const { uid } = req.params;
            const user = userService_1.userService.getUser(uid);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
                return;
            }
            const response = {
                success: true,
                data: user
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getUserByDiscordId(req, res, next) {
        try {
            const { discordId } = req.params;
            const user = userService_1.userService.getUserByDiscordId(discordId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
                return;
            }
            const response = {
                success: true,
                data: user
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async updateUserSettings(req, res, next) {
        try {
            const { uid } = req.params;
            const updates = req.body;
            const user = userService_1.userService.updateUser(uid, updates);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
                return;
            }
            const response = {
                success: true,
                data: user,
                message: 'Settings updated successfully'
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async linkDiscord(req, res, next) {
        try {
            const { uid } = req.params;
            const { discordId } = req.body;
            if (!discordId) {
                res.status(400).json({
                    success: false,
                    error: 'Discord ID is required'
                });
                return;
            }
            const user = userService_1.userService.linkDiscordToUser(uid, discordId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
                return;
            }
            const response = {
                success: true,
                data: user,
                message: 'Discord account linked successfully'
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteUser(req, res, next) {
        try {
            const { uid } = req.params;
            const success = userService_1.userService.deleteUser(uid);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
                return;
            }
            const response = {
                success: true,
                message: 'User deleted successfully'
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserController = UserController;
exports.userController = new UserController();
