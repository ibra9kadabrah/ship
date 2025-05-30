import React, { ChangeEvent } from 'react';

// Define the shape of the data slice this component expects
interface BunkerSupplyData {
  supplyLsifo?: string | number;
  supplyLsmgo?: string | number;
  supplyCylOil?: string | number;
  supplyMeOil?: string | number;
  supplyAeOil?: string | number;
}

// Define the props for the component
interface BunkerSupplySectionProps {
  formData: BunkerSupplyData;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  title: string; // e.g., "Supply (Since Last)" or "Bunkers Received"
  isReadOnly?: boolean;
  disabled?: boolean;
  isFieldEditable?: (fieldName: string) => boolean;
}

const BunkerSupplySection: React.FC<BunkerSupplySectionProps> = ({
  formData,
  handleChange,
  title,
  isReadOnly = false,
  disabled = false,
  isFieldEditable,
}) => {
  const getFieldDisabledState = (fieldName: string): boolean => {
    if (disabled) return true;
    if (isFieldEditable) return !isFieldEditable(fieldName);
    return isReadOnly;
  };
  return (
    <>
      <h4 className="font-medium mb-2 text-gray-800">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="supplyLsifo" className="block text-sm font-medium text-gray-700">Supply LSIFO (MT)</label>
          <input
            type="number" step="0.01" id="supplyLsifo" name="supplyLsifo"
            value={formData.supplyLsifo ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('supplyLsifo')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('supplyLsifo') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="supplyLsmgo" className="block text-sm font-medium text-gray-700">Supply LSMGO (MT)</label>
          <input
            type="number" step="0.01" id="supplyLsmgo" name="supplyLsmgo"
            value={formData.supplyLsmgo ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('supplyLsmgo')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('supplyLsmgo') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="supplyCylOil" className="block text-sm font-medium text-gray-700">Supply Cyl Oil (L)</label>
          <input
            type="number" step="0.1" id="supplyCylOil" name="supplyCylOil"
            value={formData.supplyCylOil ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('supplyCylOil')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('supplyCylOil') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="supplyMeOil" className="block text-sm font-medium text-gray-700">Supply ME Oil (L)</label>
          <input
            type="number" step="0.1" id="supplyMeOil" name="supplyMeOil"
            value={formData.supplyMeOil ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('supplyMeOil')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('supplyMeOil') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="supplyAeOil" className="block text-sm font-medium text-gray-700">Supply AE Oil (L)</label>
          <input
            type="number" step="0.1" id="supplyAeOil" name="supplyAeOil"
            value={formData.supplyAeOil ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('supplyAeOil')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('supplyAeOil') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>
    </>
  );
};

export default BunkerSupplySection;
