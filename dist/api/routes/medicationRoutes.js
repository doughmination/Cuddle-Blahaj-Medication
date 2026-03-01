"use strict";
/** src/api/routes/medicationRoutes.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicationRouter = void 0;
const express_1 = require("express");
const medicationController_1 = require("../controllers/medicationController");
exports.medicationRouter = (0, express_1.Router)();
// Get medications due now (for scheduler)
exports.medicationRouter.get('/due', (req, res, next) => medicationController_1.medicationController.getDueMedications(req, res, next));
// Reset daily medications (for scheduler)
exports.medicationRouter.post('/reset-daily', (req, res, next) => medicationController_1.medicationController.resetDaily(req, res, next));
// User-specific medication routes (using UID)
exports.medicationRouter.get('/:uid', (req, res, next) => medicationController_1.medicationController.getUserMedications(req, res, next));
exports.medicationRouter.post('/:uid', (req, res, next) => medicationController_1.medicationController.createMedication(req, res, next));
exports.medicationRouter.get('/:uid/:medName', (req, res, next) => medicationController_1.medicationController.getMedication(req, res, next));
exports.medicationRouter.patch('/:uid/:medName', (req, res, next) => medicationController_1.medicationController.updateMedication(req, res, next));
exports.medicationRouter.delete('/:uid/:medName', (req, res, next) => medicationController_1.medicationController.deleteMedication(req, res, next));
exports.medicationRouter.post('/:uid/:medName/taken', (req, res, next) => medicationController_1.medicationController.markTaken(req, res, next));
exports.medicationRouter.post('/:uid/:medName/not-taken', (req, res, next) => medicationController_1.medicationController.markNotTaken(req, res, next));
