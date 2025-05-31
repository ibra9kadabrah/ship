import React, { ChangeEvent } from 'react';

interface VoyageDetailsSectionProps {
  formData: {
    departurePort: string;
    destinationPort: string;
    voyageDistance: string | number; // Can be string from input, number after parsing
    etaDate: string;
    etaTime: string;
  };
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
  isDeparturePortReadOnly?: boolean; // New prop
}

const VoyageDetailsSection: React.FC<VoyageDetailsSectionProps> = ({
  formData,
  handleChange,
  isFieldEditable = () => true,
  isModifyMode = false,
  isDeparturePortReadOnly = false, // Default to false
}) => {
  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">Voyage Details</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="departurePort" className="block text-sm font-medium text-gray-700">
            Departure Port
          </label>
          <input
            type="text"
            id="departurePort"
            name="departurePort"
            value={formData.departurePort}
            onChange={handleChange}
            required
            readOnly={isDeparturePortReadOnly || (isModifyMode && !isFieldEditable('departurePort'))}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              (isDeparturePortReadOnly || (isModifyMode && !isFieldEditable('departurePort'))) ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="destinationPort" className="block text-sm font-medium text-gray-700">
            Destination Port
          </label>
          <input
            type="text"
            id="destinationPort"
            name="destinationPort"
            value={formData.destinationPort}
            onChange={handleChange}
            required
            readOnly={isModifyMode && !isFieldEditable('destinationPort')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('destinationPort') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="voyageDistance" className="block text-sm font-medium text-gray-700">
            Voyage Distance (NM)
          </label>
          <input
            type="number"
            id="voyageDistance"
            name="voyageDistance"
            value={formData.voyageDistance}
            onChange={handleChange}
            required
            min="0"
            readOnly={isModifyMode && !isFieldEditable('voyageDistance')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('voyageDistance') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="etaDate" className="block text-sm font-medium text-gray-700">
            ETA Date
          </label>
          <input
            type="date"
            id="etaDate"
            name="etaDate"
            value={formData.etaDate}
            onChange={handleChange}
            required
            readOnly={isModifyMode && !isFieldEditable('etaDate')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('etaDate') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="etaTime" className="block text-sm font-medium text-gray-700">
            ETA Time
          </label>
          <input
            type="time"
            id="etaTime"
            name="etaTime"
            value={formData.etaTime}
            onChange={handleChange}
            required
            readOnly={isModifyMode && !isFieldEditable('etaTime')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('etaTime') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
      </div>
    </fieldset>
  );
};

export default VoyageDetailsSection;