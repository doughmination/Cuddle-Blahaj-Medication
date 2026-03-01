"use strict";
/** src/api/middleware/errorHandler.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    const response = {
        success: false,
        error: err.message || 'Internal server error'
    };
    // Determine status code based on error type
    let statusCode = 500;
    if (err.message.includes('not found')) {
        statusCode = 404;
    }
    else if (err.message.includes('already exists') ||
        err.message.includes('Invalid') ||
        err.message.includes('required')) {
        statusCode = 400;
    }
    res.status(statusCode).json(response);
}
