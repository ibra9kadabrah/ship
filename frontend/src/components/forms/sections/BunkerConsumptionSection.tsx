import React, { ChangeEvent } from 'react';

// Define the shape of the data slice this component expects
interface BunkerConsumptionData {
  meConsumptionLsifo?: string | number;
  meConsumptionLsmgo?: string | number;
  meConsumptionCylOil?: string | number;
  meConsumptionMeOil?: string | number;
  meConsumptionAeOil?: string | number;
  boilerConsumptionLsifo?: string | number;
  boilerConsumptionLsmgo?: string | number;
  auxConsumptionLsifo?: string | number;
  auxConsumptionLsmgo?: string | number;
}

// Define the props for the component
interface BunkerConsumptionSectionProps {
  formData: BunkerConsumptionData;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isReadOnly?: boolean; // Kept for direct readOnly control if needed
  disabled?: boolean; // For disabling the whole section
  isFieldEditable?: (fieldName: string) => boolean; // For fine-grained control
}

const BunkerConsumptionSection: React.FC<BunkerConsumptionSectionProps> = ({
  formData,
  handleChange,
  isReadOnly = false,
  disabled = false,
  isFieldEditable,
}) => {
  // Helper to determine if a specific field should be disabled
  const getFieldDisabledState = (fieldName: string): boolean => {
    if (disabled) return true; // Whole section is disabled
    if (isFieldEditable) return !isFieldEditable(fieldName); // Use isFieldEditable if provided
    return isReadOnly; // Fallback to isReadOnly
  };
  return (
    <>
      <h4 className="font-medium mb-2 text-gray-800">Consumption</h4> {/* Static title */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label htmlFor="meConsumptionLsifo" className="block text-sm font-medium text-gray-700">ME LSIFO (MT)</label>
          <input
            type="number" step="0.01" id="meConsumptionLsifo" name="meConsumptionLsifo"
            value={formData.meConsumptionLsifo ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('meConsumptionLsifo')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meConsumptionLsifo') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meConsumptionLsmgo" className="block text-sm font-medium text-gray-700">ME LSMGO (MT)</label>
          <input
            type="number" step="0.01" id="meConsumptionLsmgo" name="meConsumptionLsmgo"
            value={formData.meConsumptionLsmgo ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('meConsumptionLsmgo')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meConsumptionLsmgo') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meConsumptionCylOil" className="block text-sm font-medium text-gray-700">ME Cyl Oil (L)</label>
          <input
            type="number" step="0.1" id="meConsumptionCylOil" name="meConsumptionCylOil"
            value={formData.meConsumptionCylOil ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('meConsumptionCylOil')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meConsumptionCylOil') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meConsumptionMeOil" className="block text-sm font-medium text-gray-700">ME ME Oil (L)</label>
          <input
            type="number" step="0.1" id="meConsumptionMeOil" name="meConsumptionMeOil"
            value={formData.meConsumptionMeOil ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('meConsumptionMeOil')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meConsumptionMeOil') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meConsumptionAeOil" className="block text-sm font-medium text-gray-700">ME AE Oil (L)</label>
          <input
            type="number" step="0.1" id="meConsumptionAeOil" name="meConsumptionAeOil"
            value={formData.meConsumptionAeOil ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('meConsumptionAeOil')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meConsumptionAeOil') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="boilerConsumptionLsifo" className="block text-sm font-medium text-gray-700">Boiler LSIFO (MT)</label>
          <input
            type="number" step="0.01" id="boilerConsumptionLsifo" name="boilerConsumptionLsifo"
            value={formData.boilerConsumptionLsifo ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('boilerConsumptionLsifo')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('boilerConsumptionLsifo') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="boilerConsumptionLsmgo" className="block text-sm font-medium text-gray-700">Boiler LSMGO (MT)</label>
          <input
            type="number" step="0.01" id="boilerConsumptionLsmgo" name="boilerConsumptionLsmgo"
            value={formData.boilerConsumptionLsmgo ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('boilerConsumptionLsmgo')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('boilerConsumptionLsmgo') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="auxConsumptionLsifo" className="block text-sm font-medium text-gray-700">Aux LSIFO (MT)</label>
          <input
            type="number" step="0.01" id="auxConsumptionLsifo" name="auxConsumptionLsifo"
            value={formData.auxConsumptionLsifo ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('auxConsumptionLsifo')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('auxConsumptionLsifo') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="auxConsumptionLsmgo" className="block text-sm font-medium text-gray-700">Aux LSMGO (MT)</label>
          <input
            type="number" step="0.01" id="auxConsumptionLsmgo" name="auxConsumptionLsmgo"
            value={formData.auxConsumptionLsmgo ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('auxConsumptionLsmgo')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('auxConsumptionLsmgo') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>
    </>
  );
};

export default BunkerConsumptionSection;
