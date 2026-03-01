"use strict";
/** src/api/routes/authRoutes.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
exports.authRouter = (0, express_1.Router)();
// Discord OAuth login URL
exports.authRouter.get('/discord', (req, res, next) => authController_1.authController.getDiscordAuthUrl(req, res, next));
// Discord OAuth callback
exports.authRouter.get('/discord/callback', (req, res, next) => authController_1.authController.handleDiscordCallback(req, res, next));
// Logout
exports.authRouter.post('/logout', (req, res, next) => authController_1.authController.logout(req, res, next));
// Get current user session
exports.authRouter.get('/me', (req, res, next) => authController_1.authController.getCurrentUser(req, res, next));
// Update user settings (timezone)
exports.authRouter.patch('/settings', (req, res, next) => authController_1.authController.updateUserSettings(req, res, next));
