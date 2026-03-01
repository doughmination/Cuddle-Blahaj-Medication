"use strict";
/** src/api/routes/userRoutes.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
exports.userRouter = (0, express_1.Router)();
// Create new user
exports.userRouter.post('/', (req, res, next) => userController_1.userController.createUser(req, res, next));
// Get user by UID
exports.userRouter.get('/:uid', (req, res, next) => userController_1.userController.getUser(req, res, next));
// Update user settings
exports.userRouter.patch('/:uid/settings', (req, res, next) => userController_1.userController.updateUserSettings(req, res, next));
// Get user by Discord ID
exports.userRouter.get('/discord/:discordId', (req, res, next) => userController_1.userController.getUserByDiscordId(req, res, next));
// Link Discord to user
exports.userRouter.post('/:uid/link-discord', (req, res, next) => userController_1.userController.linkDiscord(req, res, next));
// Delete user
exports.userRouter.delete('/:uid', (req, res, next) => userController_1.userController.deleteUser(req, res, next));
