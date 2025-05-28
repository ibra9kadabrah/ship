import React, { ChangeEvent } from 'react';
import { CargoStatus } from '../../../../types/report'; // Adjusted path

interface DraftsCargoSectionProps {
  formData: {
    fwdDraft: string | number;
    aftDraft: string | number;
    cargoQuantity: string | number;
    cargoType: string;
    cargoStatus: CargoStatus;
  };
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
}

const DraftsCargoSection: React.FC<DraftsCargoSectionProps> = ({
  formData,
  handleChange,
  isFieldEditable = () => true,
  isModifyMode = false,
}) => {
  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">Drafts & Cargo</legend>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="fwdDraft" className="block text-sm font-medium text-gray-700">
            Fwd Draft (m)
          </label>
          <input
            type="number"
            step="0.01"
            id="fwdDraft"
            name="fwdDraft"
            value={formData.fwdDraft}
            onChange={handleChange}
            required
            min="0"
            readOnly={isModifyMode && !isFieldEditable('fwdDraft')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('fwdDraft') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="aftDraft" className="block text-sm font-medium text-gray-700">
            Aft Draft (m)
          </label>
          <input
            type="number"
            step="0.01"
            id="aftDraft"
            name="aftDraft"
            value={formData.aftDraft}
            onChange={handleChange}
            required
            min="0"
            readOnly={isModifyMode && !isFieldEditable('aftDraft')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('aftDraft') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="cargoQuantity" className="block text-sm font-medium text-gray-700">
            Cargo Quantity (MT)
          </label>
          <input
            type="number"
            id="cargoQuantity"
            name="cargoQuantity"
            value={formData.cargoQuantity}
            onChange={handleChange}
            required
            min="0"
            readOnly={isModifyMode && !isFieldEditable('cargoQuantity')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('cargoQuantity') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="cargoType" className="block text-sm font-medium text-gray-700">
            Cargo Type
          </label>
          <input
            type="text"
            id="cargoType"
            name="cargoType"
            value={formData.cargoType}
            onChange={handleChange}
            required
            readOnly={isModifyMode && !isFieldEditable('cargoType')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('cargoType') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="cargoStatus" className="block text-sm font-medium text-gray-700">
            Cargo Status
          </label>
          <select
            id="cargoStatus"
            name="cargoStatus"
            value={formData.cargoStatus}
            onChange={handleChange}
            required
            disabled={isModifyMode && !isFieldEditable('cargoStatus')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${
              isModifyMode && !isFieldEditable('cargoStatus') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="Loaded">Loaded</option>
            <option value="Empty">Empty</option>
            {/* Add other statuses if applicable, e.g., Ballast, Laden */}
          </select>
        </div>
      </div>
    </fieldset>
  );
};

export default DraftsCargoSection;