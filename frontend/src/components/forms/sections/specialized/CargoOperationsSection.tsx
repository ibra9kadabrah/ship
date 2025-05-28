import React, { ChangeEvent } from 'react';
import { CargoStatus } from '../../../../types/report'; // Import CargoStatus

interface CargoOperationsSectionProps {
  formData: {
    cargoOpsStartDate: string;
    cargoOpsStartTime: string;
    cargoOpsEndDate: string;
    cargoOpsEndTime: string;
    cargoLoaded: string;  // Assuming string for form input, will be parsed to number
    cargoUnloaded: string; // Assuming string for form input
  };
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
  initialCargoStatus?: CargoStatus | null; // Added prop
  // activeModificationChecklist might be needed for granular control
}

const CargoOperationsSection: React.FC<CargoOperationsSectionProps> = ({
  formData,
  handleChange,
  isFieldEditable = () => true,
  isModifyMode = false
}) => {
  // Simplified editability for the whole section for now.
  const isSectionGenerallyEditable = !isModifyMode || isFieldEditable('cargoOpsStartDate');

  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">Cargo Operations</legend>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label htmlFor="cargoOpsStartDate" className="block text-sm font-medium text-gray-700">Ops Start Date</label>
          <input
            type="date"
            id="cargoOpsStartDate"
            name="cargoOpsStartDate"
            value={formData.cargoOpsStartDate}
            onChange={handleChange}
            required
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="cargoOpsStartTime" className="block text-sm font-medium text-gray-700">Ops Start Time</label>
          <input
            type="time"
            id="cargoOpsStartTime"
            name="cargoOpsStartTime"
            value={formData.cargoOpsStartTime}
            onChange={handleChange}
            required
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="cargoOpsEndDate" className="block text-sm font-medium text-gray-700">Ops End Date</label>
          <input
            type="date"
            id="cargoOpsEndDate"
            name="cargoOpsEndDate"
            value={formData.cargoOpsEndDate}
            onChange={handleChange}
            required
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="cargoOpsEndTime" className="block text-sm font-medium text-gray-700">Ops End Time</label>
          <input
            type="time"
            id="cargoOpsEndTime"
            name="cargoOpsEndTime"
            value={formData.cargoOpsEndTime}
            onChange={handleChange}
            required
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cargoLoaded" className="block text-sm font-medium text-gray-700">Cargo Loaded (MT)</label>
          <input
            type="number"
            step="0.01"
            id="cargoLoaded"
            name="cargoLoaded"
            value={formData.cargoLoaded ?? ''}
            onChange={handleChange}
            min="0"
            placeholder="0.00" // Optional field
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="cargoUnloaded" className="block text-sm font-medium text-gray-700">Cargo Unloaded (MT)</label>
          <input
            type="number"
            step="0.01"
            id="cargoUnloaded"
            name="cargoUnloaded"
            value={formData.cargoUnloaded ?? ''}
            onChange={handleChange}
            min="0"
            placeholder="0.00" // Optional field
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
      </div>
    </fieldset>
  );
};

export default CargoOperationsSection;