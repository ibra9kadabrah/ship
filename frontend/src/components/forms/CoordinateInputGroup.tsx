{/* // frontend/src/components/forms/CoordinateInputGroup.tsx */}
import React from 'react';

type Direction = 'N' | 'S' | 'E' | 'W' | '';
type DirectionOptions = ('N' | 'S')[] | ('E' | 'W')[];

interface CoordinateInputGroupProps {
  label: string;
  idPrefix: string;
  degreeValue: string | number;
  minuteValue: string | number;
  directionValue: Direction;
  onDegreeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMinuteChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDirectionChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  directionOptions: DirectionOptions;
  degreeError?: string | null;
  minuteError?: string | null;
  directionError?: string | null;
  required?: boolean; // Add required prop
}

const CoordinateInputGroup: React.FC<CoordinateInputGroupProps> = ({
  label,
  idPrefix,
  degreeValue,
  minuteValue,
  directionValue,
  onDegreeChange,
  onMinuteChange,
  onDirectionChange,
  directionOptions,
  degreeError,
  minuteError,
  directionError,
  required = false, // Default to false
}) => {
  const hasError = degreeError || minuteError || directionError;

  return (
    <div className="mb-4">
      <label className={`block text-sm font-medium mb-1 ${hasError ? 'text-red-600' : 'text-gray-700'}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="grid grid-cols-3 gap-2 items-start">
        {/* Degree Input */}
        <div>
          <input
            type="number"
            id={`${idPrefix}Deg`}
            name={`${idPrefix}Deg`}
            value={degreeValue}
            onChange={onDegreeChange}
            placeholder="Deg"
            min="0" // Basic validation
            step="1"
            className={`mt-1 block w-full px-3 py-2 border ${
              degreeError ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            required={required}
          />
          {degreeError && <p className="mt-1 text-xs text-red-600">{degreeError}</p>}
        </div>

        {/* Minute Input */}
        <div>
          <input
            type="number"
            id={`${idPrefix}Min`}
            name={`${idPrefix}Min`}
            value={minuteValue}
            onChange={onMinuteChange}
            placeholder="Min"
            min="0"
            max="59.999" // Basic validation
            step="0.001" // Allow decimals for minutes
            className={`mt-1 block w-full px-3 py-2 border ${
              minuteError ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            required={required}
          />
          {minuteError && <p className="mt-1 text-xs text-red-600">{minuteError}</p>}
        </div>

        {/* Direction Select */}
        <div>
          <select
            id={`${idPrefix}Dir`}
            name={`${idPrefix}Dir`}
            value={directionValue}
            onChange={onDirectionChange}
            className={`mt-1 block w-full px-3 py-2 border ${
              directionError ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white`}
            required={required}
          >
            <option value="" disabled>Dir</option>
            {directionOptions.map((dir) => (
              <option key={dir} value={dir}>
                {dir}
              </option>
            ))}
          </select>
          {directionError && <p className="mt-1 text-xs text-red-600">{directionError}</p>}
        </div>
      </div>
    </div>
  );
};

export default CoordinateInputGroup;
