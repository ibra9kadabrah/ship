import React, { ChangeEvent } from 'react';
import CoordinateInputGroup from '../../CoordinateInputGroup'; // Adjusted path

interface EOSPSectionProps {
  formData: {
    eospDate: string;
    eospTime: string;
    eospLatDeg: string;
    eospLatMin: string;
    eospLatDir: 'N' | 'S';
    eospLonDeg: string;
    eospLonMin: string;
    eospLonDir: 'E' | 'W';
    eospCourse: string;
  };
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleCoordinateChange: (
    prefix: 'eospLat' | 'eospLon', 
    part: 'Deg' | 'Min' | 'Dir', 
    value: string
  ) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
  // activeModificationChecklist might be needed if EOSP fields are individually editable
  // For now, assuming the whole section is editable or not based on a general check or form state
}

const EOSPSection: React.FC<EOSPSectionProps> = ({
  formData,
  handleChange,
  handleCoordinateChange,
  isFieldEditable = () => true,
  isModifyMode = false
}) => {
  // Simplified editability for the whole section for now.
  // This can be made more granular if needed, similar to FASPSection.
  const isSectionGenerallyEditable = !isModifyMode || isFieldEditable('eospDate'); // Check one field as representative

  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">End of Sea Passage (EOSP)</legend>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="eospDate" className="block text-sm font-medium text-gray-700">
            EOSP Date
          </label>
          <input
            type="date"
            id="eospDate"
            name="eospDate"
            value={formData.eospDate}
            onChange={handleChange}
            required
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="eospTime" className="block text-sm font-medium text-gray-700">
            EOSP Time
          </label>
          <input
            type="time"
            id="eospTime"
            name="eospTime"
            value={formData.eospTime}
            onChange={handleChange}
            required
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        {/* Empty div for grid alignment if needed, or adjust col-span */}
        <div className="md:col-span-1"></div>

        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <CoordinateInputGroup
            label="EOSP Latitude"
            idPrefix="eospLat"
            degreeValue={formData.eospLatDeg ?? ''}
            minuteValue={formData.eospLatMin ?? ''}
            directionValue={formData.eospLatDir ?? 'N'}
            onDegreeChange={(e) => handleCoordinateChange('eospLat', 'Deg', e.target.value)}
            onMinuteChange={(e) => handleCoordinateChange('eospLat', 'Min', e.target.value)}
            onDirectionChange={(e) => handleCoordinateChange('eospLat', 'Dir', e.target.value)}
            directionOptions={['N', 'S']}
            required={true}
            readOnly={!isSectionGenerallyEditable}
            disabled={!isSectionGenerallyEditable}
          />
          <CoordinateInputGroup
            label="EOSP Longitude"
            idPrefix="eospLon"
            degreeValue={formData.eospLonDeg ?? ''}
            minuteValue={formData.eospLonMin ?? ''}
            directionValue={formData.eospLonDir ?? 'E'}
            onDegreeChange={(e) => handleCoordinateChange('eospLon', 'Deg', e.target.value)}
            onMinuteChange={(e) => handleCoordinateChange('eospLon', 'Min', e.target.value)}
            onDirectionChange={(e) => handleCoordinateChange('eospLon', 'Dir', e.target.value)}
            directionOptions={['E', 'W']}
            required={true}
            readOnly={!isSectionGenerallyEditable}
            disabled={!isSectionGenerallyEditable}
          />
        </div>
        <div>
          <label htmlFor="eospCourse" className="block text-sm font-medium text-gray-700">
            EOSP Course (°)
          </label>
          <input
            type="number"
            id="eospCourse"
            name="eospCourse"
            value={formData.eospCourse}
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
    </fieldset>
  );
};

export default EOSPSection;