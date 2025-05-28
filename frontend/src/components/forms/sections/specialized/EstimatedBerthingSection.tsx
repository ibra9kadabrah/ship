import React, { ChangeEvent } from 'react';

interface EstimatedBerthingSectionProps {
  formData: {
    estimatedBerthingDate: string;
    estimatedBerthingTime: string;
  };
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
}

const EstimatedBerthingSection: React.FC<EstimatedBerthingSectionProps> = ({
  formData,
  handleChange,
  isFieldEditable = () => true,
  isModifyMode = false,
}) => {
  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">Estimated Berthing</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="estimatedBerthingDate" className="block text-sm font-medium text-gray-700">
            Est. Berthing Date
          </label>
          <input
            type="date"
            id="estimatedBerthingDate"
            name="estimatedBerthingDate"
            value={formData.estimatedBerthingDate}
            onChange={handleChange}
            required
            readOnly={isModifyMode && !isFieldEditable('estimatedBerthingDate')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('estimatedBerthingDate') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="estimatedBerthingTime" className="block text-sm font-medium text-gray-700">
            Est. Berthing Time
          </label>
          <input
            type="time"
            id="estimatedBerthingTime"
            name="estimatedBerthingTime"
            value={formData.estimatedBerthingTime}
            onChange={handleChange}
            required
            readOnly={isModifyMode && !isFieldEditable('estimatedBerthingTime')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('estimatedBerthingTime') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
      </div>
    </fieldset>
  );
};

export default EstimatedBerthingSection;