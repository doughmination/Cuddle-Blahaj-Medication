"use strict";
/** src/api/controllers/authController.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const userService_1 = require("../services/userService");
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const NODE_ENV = process.env.NODE_ENV || 'development';
function getCookieOptions() {
    const isProduction = NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
        domain: undefined,
    };
}
// NEW: Cookie options for WebSocket token (readable by JavaScript)
function getWSTokenCookieOptions() {
    const isProduction = NODE_ENV === 'production';
    return {
        httpOnly: false, // ← Allow JavaScript access for WebSocket
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
        domain: undefined,
    };
}
class AuthController {
    getDiscordAuthUrl(req, res, next) {
        try {
            const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;
            const response = {
                success: true,
                data: { url: authUrl }
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async handleDiscordCallback(req, res, next) {
        try {
            const { code } = req.query;
            console.log('🔐 OAuth callback received');
            if (!code || typeof code !== 'string') {
                console.error('❌ No code provided in callback');
                res.redirect(`${FRONTEND_URL}/?error=no_code`);
                return;
            }
            // Exchange code for access token
            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: DISCORD_CLIENT_ID,
                    client_secret: DISCORD_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: DISCORD_REDIRECT_URI,
                }),
            });
            if (!tokenResponse.ok) {
                console.error('❌ Token exchange failed:', await tokenResponse.text());
                res.redirect(`${FRONTEND_URL}/?error=token_exchange_failed`);
                return;
            }
            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;
            // Get user info from Discord
            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!userResponse.ok) {
                console.error('❌ User fetch failed:', await userResponse.text());
                res.redirect(`${FRONTEND_URL}/?error=user_fetch_failed`);
                return;
            }
            const discordUser = await userResponse.json();
            const discordId = discordUser.id;
            // Check if user exists, if not create one with UTC timezone
            let user = userService_1.userService.getUserByDiscordId(discordId);
            if (!user) {
                // Create user with UTC timezone (user can change it in settings)
                user = userService_1.userService.createUser('discord', discordId, 'UTC');
                console.log(`✅ Created new user for Discord ID: ${discordId} with timezone: UTC`);
            }
            else {
                console.log(`✅ Found existing user: ${user.uid}`);
            }
            // Store user session
            const sessionToken = userService_1.userService.generateSessionToken(user.uid);
            // Set TWO cookies:
            // 1. httpOnly cookie for API authentication (secure)
            res.cookie('session_token', sessionToken, getCookieOptions());
            // 2. JavaScript-readable cookie for WebSocket connection (same token)
            res.cookie('ws_token', sessionToken, getWSTokenCookieOptions());
            console.log(`✅ Session cookies set for user ${user.uid}`);
            // Redirect to frontend dashboard
            res.redirect(`${FRONTEND_URL}/dashboard`);
        }
        catch (error) {
            console.error('❌ Discord OAuth error:', error);
            res.redirect(`${FRONTEND_URL}/?error=auth_failed`);
        }
    }
    logout(req, res, next) {
        try {
            // Clear both cookies
            res.clearCookie('session_token', getCookieOptions());
            res.clearCookie('ws_token', getWSTokenCookieOptions());
            const response = {
                success: true,
                message: 'Logged out successfully'
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getCurrentUser(req, res, next) {
        try {
            const sessionToken = req.cookies?.session_token;
            if (!sessionToken) {
                res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
                return;
            }
            const uid = userService_1.userService.validateSessionToken(sessionToken);
            if (!uid) {
                res.clearCookie('session_token', getCookieOptions());
                res.clearCookie('ws_token', getWSTokenCookieOptions());
                res.status(401).json({
                    success: false,
                    error: 'Invalid or expired session'
                });
                return;
            }
            const user = userService_1.userService.getUser(uid);
            if (!user) {
                res.clearCookie('session_token', getCookieOptions());
                res.clearCookie('ws_token', getWSTokenCookieOptions());
                res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
                return;
            }
            const response = {
                success: true,
                data: { uid, user }
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async updateUserSettings(req, res, next) {
        try {
            const sessionToken = req.cookies?.session_token;
            if (!sessionToken) {
                res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
                return;
            }
            const uid = userService_1.userService.validateSessionToken(sessionToken);
            if (!uid) {
                res.status(401).json({
                    success: false,
                    error: 'Invalid session'
                });
                return;
            }
            const { timezone } = req.body;
            const user = userService_1.userService.updateUser(uid, { timezone });
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
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
