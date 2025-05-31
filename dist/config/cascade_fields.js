"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRITICAL_FIELDS = void 0;
exports.isCriticalField = isCriticalField;
exports.getCascadeType = getCascadeType;
// src/config/cascade_fields.ts
exports.CRITICAL_FIELDS = {
    DISTANCE: ['distanceSinceLastReport', 'harbourDistance', 'voyageDistance'],
    BUNKER_CONSUMPTION: ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil', 'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo'],
    BUNKER_SUPPLY: ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'],
    CARGO: ['cargoQuantity', 'cargoType', 'cargoStatus', 'cargoLoaded', 'cargoUnloaded'],
    PORT_CONTINUITY: ['departurePort', 'destinationPort']
};
function isCriticalField(fieldName) {
    return Object.values(exports.CRITICAL_FIELDS).flat().includes(fieldName);
}
function getCascadeType(fieldName) {
    for (const [type, fields] of Object.entries(exports.CRITICAL_FIELDS)) {
        if (fields.includes(fieldName))
            return type;
    }
    return null;
}
