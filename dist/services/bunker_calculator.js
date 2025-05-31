"use strict";
// src/services/bunker_calculator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTotalConsumptions = calculateTotalConsumptions;
exports.calculateCurrentRobs = calculateCurrentRobs;
// --- Calculation Functions ---
/**
 * Calculates the total consumption for each fuel type based on ME, Boiler, and Aux inputs.
 * Uses nullish coalescing (?? 0) to treat null/undefined inputs as zero.
 */
function calculateTotalConsumptions(input) {
    const totalConsumptionLsifo = (input.meConsumptionLsifo ?? 0) + (input.boilerConsumptionLsifo ?? 0) + (input.auxConsumptionLsifo ?? 0);
    const totalConsumptionLsmgo = (input.meConsumptionLsmgo ?? 0) + (input.boilerConsumptionLsmgo ?? 0) + (input.auxConsumptionLsmgo ?? 0);
    const totalConsumptionCylOil = (input.meConsumptionCylOil ?? 0); // Only ME consumes CylOil
    const totalConsumptionMeOil = (input.meConsumptionMeOil ?? 0); // Only ME consumes MeOil
    const totalConsumptionAeOil = (input.meConsumptionAeOil ?? 0); // Only ME consumes AeOil (Check if Aux consumes this too? Assuming not for now)
    return {
        totalConsumptionLsifo,
        totalConsumptionLsmgo,
        totalConsumptionCylOil,
        totalConsumptionMeOil,
        totalConsumptionAeOil,
    };
}
/**
 * Calculates the current ROB for each fuel type.
 * Current ROB = Previous ROB - Total Consumption + Supply
 * Uses nullish coalescing (?? 0) for supply inputs.
 */
function calculateCurrentRobs(previousRob, totalConsumptions, supplies) {
    const currentRobLsifo = previousRob.lsifo - totalConsumptions.totalConsumptionLsifo + (supplies.supplyLsifo ?? 0);
    const currentRobLsmgo = previousRob.lsmgo - totalConsumptions.totalConsumptionLsmgo + (supplies.supplyLsmgo ?? 0);
    const currentRobCylOil = previousRob.cylOil - totalConsumptions.totalConsumptionCylOil + (supplies.supplyCylOil ?? 0);
    const currentRobMeOil = previousRob.meOil - totalConsumptions.totalConsumptionMeOil + (supplies.supplyMeOil ?? 0);
    const currentRobAeOil = previousRob.aeOil - totalConsumptions.totalConsumptionAeOil + (supplies.supplyAeOil ?? 0);
    // Ensure ROB doesn't go negative (optional, but good practice)
    return {
        currentRobLsifo: Math.max(0, currentRobLsifo),
        currentRobLsmgo: Math.max(0, currentRobLsmgo),
        currentRobCylOil: Math.max(0, currentRobCylOil),
        currentRobMeOil: Math.max(0, currentRobMeOil),
        currentRobAeOil: Math.max(0, currentRobAeOil),
    };
}
