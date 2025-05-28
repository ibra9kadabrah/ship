import React, { ChangeEvent } from 'react';

interface GeneralInfoSectionProps {
  formData: {
    reportDate: string;
    reportTime: string;
    timeZone: string;
  };
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
}

const GeneralInfoSection: React.FC<GeneralInfoSectionProps> = ({
  formData,
  handleChange,
  isFieldEditable = () => true,
  isModifyMode = false
}) => {
  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">General Info</legend>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">
            Report Date
          </label>
          <input
            type="date"
            id="reportDate"
            name="reportDate"
            value={formData.reportDate}
            onChange={handleChange}
            required
            readOnly={isModifyMode && !isFieldEditable('reportDate')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('reportDate') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="reportTime" className="block text-sm font-medium text-gray-700">
            Report Time
          </label>
          <input
            type="time"
            id="reportTime"
            name="reportTime"
            value={formData.reportTime}
            onChange={handleChange}
            required
            readOnly={isModifyMode && !isFieldEditable('reportTime')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('reportTime') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
            Time Zone (e.g., UTC+3)
          </label>
          <input
            type="text"
            id="timeZone"
            name="timeZone"
            value={formData.timeZone}
            onChange={handleChange}
            required
            placeholder="UTC+/-HH:MM or Name"
            readOnly={isModifyMode && !isFieldEditable('timeZone')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('timeZone') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
      </div>
    </fieldset>
  );
};

export default GeneralInfoSection;