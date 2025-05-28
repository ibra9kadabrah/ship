import { EngineUnitData, AuxEngineData } from '../types/report'; // Adjusted path assuming types are in ../types

export interface ValidationError {
  field: string;
  message: string;
}

export const validateNumericFields = (
  formData: any, 
  numericFields: string[],
  optionalNumericFields: string[] = [] // Fields that are numeric but not strictly required to have a value
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  numericFields.forEach(field => {
    const value = formData[field];
    // Error if field has a value but it's not a number
    if (value !== undefined && value !== null && String(value).trim() !== '' && isNaN(Number(value))) {
      errors.push({
        field,
        message: `${field} must be a valid number.`
      });
    } 
    // Error if field is required (not in optionalNumericFields) and is empty
    else if (!optionalNumericFields.includes(field) && (value === undefined || value === null || String(value).trim() === '')) {
        // This specific check for required numeric might be better handled by validateRequiredFields
        // For now, focusing on "if present, must be numeric"
    }
  });
  
  return errors;
};

export const validateRequiredFields = (
  formData: any, 
  requiredFields: string[]
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  requiredFields.forEach(field => {
    const value = formData[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push({
        field,
        message: `Field "${field}" is required.`
      });
    }
  });
  
  return errors;
};

export const validateEngineUnits = (engineUnits?: EngineUnitData[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!engineUnits) return errors;

  const numericFields: (keyof Omit<EngineUnitData, 'unitNumber' | 'id' | 'reportId' | 'createdAt' | 'updatedAt'>)[] = 
    ['exhaustTemp', 'underPistonAir', 'pcoOutletTemp', 'jcfwOutletTemp'];
  
  engineUnits.forEach((unit) => {
    numericFields.forEach(field => {
      const value = unit[field];
      // Optional fields: if they have a value, it must be numeric. Empty is fine.
      if (value !== undefined && value !== null && String(value).trim() !== '' && isNaN(Number(value))) {
        errors.push({
          field: `engineUnit${unit.unitNumber}_${field}`,
          message: `Engine Unit #${unit.unitNumber} ${field} must be a valid number.`
        });
      }
    });
  });
  
  return errors;
};

export const validateAuxEngines = (auxEngines?: AuxEngineData[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (!auxEngines) return errors;
  
  const numericFields: (keyof Omit<AuxEngineData, 'engineName' | 'id' | 'reportId' | 'createdAt' | 'updatedAt'>)[] = 
    ['load', 'kw', 'foPress', 'lubOilPress', 'waterTemp', 'dailyRunHour'];
  
  auxEngines.forEach((aux) => {
    numericFields.forEach(field => {
      const value = aux[field];
      // Optional fields: if they have a value, it must be numeric. Empty is fine.
      if (value !== undefined && value !== null && String(value).trim() !== '' && isNaN(Number(value))) {
        errors.push({
          field: `auxEngine_${aux.engineName}_${field}`,
          message: `Aux Engine ${aux.engineName} ${field} must be a valid number.`
        });
      }
    });
  });
  
  return errors;
};

export const validateTimeFormat = (timeValue: string | undefined | null, fieldName: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (timeValue && !/^\d{2}:\d{2}$/.test(timeValue)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} format must be HH:MM.`
    });
  }
  
  return errors;
};

export const validateCoordinates = (
  degValue: string | undefined | null, 
  minValue: string | undefined | null, 
  // dirValue is usually a select with default, so less likely to be invalid format
  fieldPrefix: string,
  isLatitude: boolean = true
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const maxDeg = isLatitude ? 90 : 180;
  
  if (degValue && (String(degValue).trim() === '' || isNaN(Number(degValue)) || Number(degValue) < 0 || Number(degValue) > maxDeg )) {
    if (String(degValue).trim() !== '' || !isNaN(Number(degValue))) { // Only error if it's not just empty but invalid
         errors.push({
            field: `${fieldPrefix}Deg`,
            message: `${fieldPrefix} degrees must be a number between 0 and ${maxDeg}.`
        });
    }
  }
  
  if (minValue && (String(minValue).trim() === '' || isNaN(Number(minValue)) || Number(minValue) < 0 || Number(minValue) >= 60)) {
     if (String(minValue).trim() !== '' || !isNaN(Number(minValue))) { // Only error if it's not just empty but invalid
        errors.push({
            field: `${fieldPrefix}Min`,
            message: `${fieldPrefix} minutes must be a number between 0 and 59.`
        });
    }
  }
  
  return errors;
};

export const validateStringOnlyFields = (
  formData: any,
  stringOnlyFields: string[]
): ValidationError[] => {
  const errors: ValidationError[] = [];
  stringOnlyFields.forEach(field => {
    const value = formData[field];
    if (value && /\d/.test(String(value))) {
      errors.push({
        field,
        message: `${field} cannot contain numbers.`
      });
    }
  });
  return errors;
};