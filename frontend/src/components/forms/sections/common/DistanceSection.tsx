import React, { ChangeEvent } from 'react';

interface DistanceSectionProps {
  formData: {
    distanceSinceLastReport?: string; // Optional as not all forms have this
    harbourDistance?: string;         // Optional as not all forms have this
    harbourTime?: string;             // Optional as not all forms have this
  };
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
  showHarbourFields?: boolean; // To control visibility of harbour specific fields
  title?: string;
}

const DistanceSection: React.FC<DistanceSectionProps> = ({
  formData,
  handleChange,
  isFieldEditable = () => true,
  isModifyMode = false,
  showHarbourFields = true, // Default to true, can be overridden by parent form
  title = "Distance Information" // Default title
}) => {
  // Determine if any field in this section is actually present in formData
  const hasDistanceSinceLast = formData.distanceSinceLastReport !== undefined;
  const hasHarbourDistance = showHarbourFields && formData.harbourDistance !== undefined;
  const hasHarbourTime = showHarbourFields && formData.harbourTime !== undefined;

  // If no relevant fields are available in formData, don't render the section
  if (!hasDistanceSinceLast && !hasHarbourDistance && !hasHarbourTime) {
    return null;
  }

  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">{title}</legend>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {hasDistanceSinceLast && (
          <div>
            <label htmlFor="distanceSinceLastReport" className="block text-sm font-medium text-gray-700">
              Distance Since Last Report (NM)
            </label>
            <input
              type="number"
              step="0.1"
              id="distanceSinceLastReport"
              name="distanceSinceLastReport"
              value={formData.distanceSinceLastReport}
              onChange={handleChange}
              required // Assuming it's required if present
              min="0"
              readOnly={isModifyMode && !isFieldEditable('distanceSinceLastReport')}
              className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
                isModifyMode && !isFieldEditable('distanceSinceLastReport') ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
        )}
        {hasHarbourDistance && (
          <div>
            <label htmlFor="harbourDistance" className="block text-sm font-medium text-gray-700">
              Harbour Distance (NM)
            </label>
            <input
              type="number"
              step="0.1"
              id="harbourDistance"
              name="harbourDistance"
              value={formData.harbourDistance}
              onChange={handleChange}
              required // Assuming it's required if present
              min="0"
              readOnly={isModifyMode && !isFieldEditable('harbourDistance')}
              className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
                isModifyMode && !isFieldEditable('harbourDistance') ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
        )}
        {hasHarbourTime && (
          <div>
            <label htmlFor="harbourTime" className="block text-sm font-medium text-gray-700">
              Harbour Time (HH:MM)
            </label>
            <input
              type="text"
              pattern="[0-9]{2}:[0-9]{2}"
              id="harbourTime"
              name="harbourTime"
              value={formData.harbourTime}
              onChange={handleChange}
              required // Assuming it's required if present
              placeholder="HH:MM"
              readOnly={isModifyMode && !isFieldEditable('harbourTime')}
              className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
                isModifyMode && !isFieldEditable('harbourTime') ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
        )}
      </div>
    </fieldset>
  );
};

export default DistanceSection;