"use strict";
/** src/api/controllers/medicationController.ts
 * @license MIT
 * Copyright (c) 2025 Clove Twilight
 * See LICENSE file in the root directory for full license text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicationController = exports.MedicationController = void 0;
const medicationService_1 = require("../services/medicationService");
class MedicationController {
    async getUserMedications(req, res, next) {
        try {
            const { uid } = req.params;
            const medications = await medicationService_1.medicationService.getUserMedications(uid);
            const response = {
                success: true,
                data: medications
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getMedication(req, res, next) {
        try {
            const { uid, medName } = req.params;
            const medication = await medicationService_1.medicationService.getMedication(uid, medName);
            if (!medication) {
                res.status(404).json({
                    success: false,
                    error: 'Medication not found'
                });
                return;
            }
            const response = {
                success: true,
                data: medication
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async createMedication(req, res, next) {
        try {
            const { uid } = req.params;
            const { name, time, frequency, dose, amount, instructions } = req.body;
            let { customDays } = req.body;
            // 🔥 FIX: Ensure customDays is a number if provided
            if (customDays !== undefined && customDays !== null) {
                if (typeof customDays === 'string') {
                    customDays = parseInt(customDays, 10);
                }
                else {
                    customDays = Number(customDays);
                }
                // If conversion failed, customDays will be NaN
                if (isNaN(customDays)) {
                    res.status(400).json({
                        success: false,
                        error: 'customDays must be a valid number'
                    });
                    return;
                }
            }
            const medication = await medicationService_1.medicationService.createMedication({
                uid,
                name,
                time,
                frequency,
                customDays,
                dose,
                amount,
                instructions
            });
            const response = {
                success: true,
                data: medication,
                message: 'Medication created successfully'
            };
            res.status(201).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async updateMedication(req, res, next) {
        try {
            const { uid, medName } = req.params;
            const updates = req.body;
            // 🔥 FIX: Ensure customDays is a number if provided
            if (updates.customDays !== undefined && updates.customDays !== null) {
                if (typeof updates.customDays === 'string') {
                    updates.customDays = parseInt(updates.customDays, 10);
                }
                else {
                    updates.customDays = Number(updates.customDays);
                }
                // If conversion failed, customDays will be NaN
                if (isNaN(updates.customDays)) {
                    res.status(400).json({
                        success: false,
                        error: 'customDays must be a valid number'
                    });
                    return;
                }
            }
            const medication = await medicationService_1.medicationService.updateMedication(uid, medName, updates);
            const response = {
                success: true,
                data: medication,
                message: 'Medication updated successfully'
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteMedication(req, res, next) {
        try {
            const { uid, medName } = req.params;
            await medicationService_1.medicationService.deleteMedication(uid, medName);
            const response = {
                success: true,
                message: 'Medication deleted successfully'
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async markTaken(req, res, next) {
        try {
            const { uid, medName } = req.params;
            await medicationService_1.medicationService.markTaken(uid, medName);
            const response = {
                success: true,
                message: 'Medication marked as taken'
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async markNotTaken(req, res, next) {
        try {
            const { uid, medName } = req.params;
            await medicationService_1.medicationService.markNotTaken(uid, medName);
            const response = {
                success: true,
                message: 'Medication marked as not taken'
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getDueMedications(req, res, next) {
        try {
            const dueMedications = await medicationService_1.medicationService.getMedicationsDueNow();
            const response = {
                success: true,
                data: dueMedications
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async resetDaily(req, res, next) {
        try {
            await medicationService_1.medicationService.resetDaily();
            const response = {
                success: true,
                message: 'Daily medications reset successfully'
            };
            res.json(response);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.MedicationController = MedicationController;
exports.medicationController = new MedicationController();
