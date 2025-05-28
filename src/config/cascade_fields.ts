// src/config/cascade_fields.ts
export const CRITICAL_FIELDS = {
  DISTANCE: ['distanceSinceLastReport', 'harbourDistance', 'voyageDistance'],
  BUNKER_CONSUMPTION: ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil', 'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo'],
  BUNKER_SUPPLY: ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'],
  CARGO: ['cargoQuantity', 'cargoType', 'cargoStatus', 'cargoLoaded', 'cargoUnloaded'],
  PORT_CONTINUITY: ['departurePort', 'destinationPort']
};

export function isCriticalField(fieldName: string): boolean {
  return Object.values(CRITICAL_FIELDS).flat().includes(fieldName);
}

export function getCascadeType(fieldName: string): string | null {
  for (const [type, fields] of Object.entries(CRITICAL_FIELDS)) {
    if (fields.includes(fieldName)) return type;
  }
  return null;
}