import React, { ChangeEvent } from 'react';
import CoordinateInputGroup from '../../CoordinateInputGroup'; // Adjusted path

interface NoonPositionSectionProps {
  formData: {
    noonDate: string;
    noonTime: string;
    noonLatDeg: string;
    noonLatMin: string;
    noonLatDir: 'N' | 'S';
    noonLonDeg: string;
    noonLonMin: string;
    noonLonDir: 'E' | 'W';
    noonCourse: string;
    // distanceSinceLastReport is handled by DistanceSection or directly in form
  };
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleCoordinateChange: (
    prefix: 'noonLat' | 'noonLon', 
    part: 'Deg' | 'Min' | 'Dir', 
    value: string
  ) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
  // activeModificationChecklist might be needed for granular control
}

const NoonPositionSection: React.FC<NoonPositionSectionProps> = ({
  formData,
  handleChange,
  handleCoordinateChange,
  isFieldEditable = () => true,
  isModifyMode = false
}) => {
  // Simplified editability for the whole section for now.
  const isSectionGenerallyEditable = !isModifyMode || isFieldEditable('noonDate'); 

  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">Noon Position & Course</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="noonDate" className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            id="noonDate"
            name="noonDate"
            value={formData.noonDate}
            onChange={handleChange}
            required
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="noonTime" className="block text-sm font-medium text-gray-700">Time</label>
          <input
            type="time"
            id="noonTime"
            name="noonTime"
            value={formData.noonTime}
            onChange={handleChange}
            required
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <CoordinateInputGroup
          label="Latitude"
          idPrefix="noonLat"
          degreeValue={formData.noonLatDeg ?? ''}
          minuteValue={formData.noonLatMin ?? ''}
          directionValue={formData.noonLatDir ?? 'N'}
          onDegreeChange={(e) => handleCoordinateChange('noonLat', 'Deg', e.target.value)}
          onMinuteChange={(e) => handleCoordinateChange('noonLat', 'Min', e.target.value)}
          onDirectionChange={(e) => handleCoordinateChange('noonLat', 'Dir', e.target.value)}
          directionOptions={['N', 'S']}
          required={true}
          readOnly={!isSectionGenerallyEditable}
          disabled={!isSectionGenerallyEditable}
        />
        <CoordinateInputGroup
          label="Longitude"
          idPrefix="noonLon"
          degreeValue={formData.noonLonDeg ?? ''}
          minuteValue={formData.noonLonMin ?? ''}
          directionValue={formData.noonLonDir ?? 'E'}
          onDegreeChange={(e) => handleCoordinateChange('noonLon', 'Deg', e.target.value)}
          onMinuteChange={(e) => handleCoordinateChange('noonLon', 'Min', e.target.value)}
          onDirectionChange={(e) => handleCoordinateChange('noonLon', 'Dir', e.target.value)}
          directionOptions={['E', 'W']}
          required={true}
          readOnly={!isSectionGenerallyEditable}
          disabled={!isSectionGenerallyEditable}
        />
        <div>
          <label htmlFor="noonCourse" className="block text-sm font-medium text-gray-700">Course (°)</label>
          <input
            type="number"
            step="any"
            id="noonCourse"
            name="noonCourse"
            value={formData.noonCourse ?? ''}
            onChange={handleChange}
            required
            min="0"
            max="360"
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
      </div>
      {/* Distance Since Last Report is typically handled outside or by a separate DistanceSection component */}
    </fieldset>
  );
};

export default NoonPositionSection;