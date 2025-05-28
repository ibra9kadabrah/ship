import React, { ChangeEvent } from 'react';
import { CardinalDirection } from '../../../../types/report'; // Adjusted path

interface WeatherSectionProps {
  formData: {
    windDirection: CardinalDirection;
    windForce: string;
    seaDirection: CardinalDirection;
    seaState: string;
    swellDirection: CardinalDirection;
    swellHeight: string;
  };
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
}

const WeatherSection: React.FC<WeatherSectionProps> = ({
  formData,
  handleChange,
  isFieldEditable = () => true,
  isModifyMode = false
}) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">Weather</legend>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="windDirection" className="block text-sm font-medium text-gray-700">
            Wind Direction
          </label>
          <select
            id="windDirection"
            name="windDirection"
            value={formData.windDirection}
            onChange={handleChange}
            required
            disabled={isModifyMode && !isFieldEditable('windDirection')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${
              isModifyMode && !isFieldEditable('windDirection') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            {directions.map(dir => (
              <option key={dir} value={dir}>{dir}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="windForce" className="block text-sm font-medium text-gray-700">
            Wind Force (Beaufort)
          </label>
          <input
            type="number"
            id="windForce"
            name="windForce"
            value={formData.windForce}
            onChange={handleChange}
            required
            min="0"
            max="12"
            readOnly={isModifyMode && !isFieldEditable('windForce')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('windForce') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="seaDirection" className="block text-sm font-medium text-gray-700">
            Sea Direction
          </label>
          <select
            id="seaDirection"
            name="seaDirection"
            value={formData.seaDirection}
            onChange={handleChange}
            required
            disabled={isModifyMode && !isFieldEditable('seaDirection')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${
              isModifyMode && !isFieldEditable('seaDirection') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            {directions.map(dir => (
              <option key={dir} value={dir}>{dir}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="seaState" className="block text-sm font-medium text-gray-700">
            Sea State (Douglas Scale)
          </label>
          <input
            type="number"
            id="seaState"
            name="seaState"
            value={formData.seaState}
            onChange={handleChange}
            required
            min="0"
            max="9"
            readOnly={isModifyMode && !isFieldEditable('seaState')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('seaState') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="swellDirection" className="block text-sm font-medium text-gray-700">
            Swell Direction
          </label>
          <select
            id="swellDirection"
            name="swellDirection"
            value={formData.swellDirection}
            onChange={handleChange}
            required
            disabled={isModifyMode && !isFieldEditable('swellDirection')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${
              isModifyMode && !isFieldEditable('swellDirection') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            {directions.map(dir => (
              <option key={dir} value={dir}>{dir}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="swellHeight" className="block text-sm font-medium text-gray-700">
            Swell Height (m)
          </label>
          <input
            type="number"
            step="0.1"
            id="swellHeight"
            name="swellHeight"
            value={formData.swellHeight}
            onChange={handleChange}
            required
            min="0"
            readOnly={isModifyMode && !isFieldEditable('swellHeight')}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              isModifyMode && !isFieldEditable('swellHeight') ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
      </div>
    </fieldset>
  );
};

export default WeatherSection;