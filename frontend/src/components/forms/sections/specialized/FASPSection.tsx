import React, { ChangeEvent } from 'react';
import CoordinateInputGroup from '../../CoordinateInputGroup'; // Adjusted path

interface FASPSectionProps {
  formData: {
    faspDate: string;
    faspTime: string;
    faspLatDeg: string;
    faspLatMin: string;
    faspLatDir: 'N' | 'S';
    faspLonDeg: string;
    faspLonMin: string;
    faspLonDir: 'E' | 'W';
    faspCourse: string;
  };
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleCoordinateChange: (
    prefix: 'faspLat' | 'faspLon', 
    part: 'Deg' | 'Min' | 'Dir', 
    value: string
  ) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  activeModificationChecklist?: string[]; // To determine editability based on checklist
  isModifyMode?: boolean;
}

const FASPSection: React.FC<FASPSectionProps> = ({
  formData,
  handleChange,
  handleCoordinateChange,
  isFieldEditable = () => true, // Default to true if not in modify mode or no specific check needed
  activeModificationChecklist = [],
  isModifyMode = false
}) => {
  // Determine editability for sub-sections based on checklist items
  // These checklist IDs should match those defined in your reportChecklists config
  const isDateTimeEditable = !isModifyMode || (activeModificationChecklist.includes('departure_fasp_datetime') && isFieldEditable('faspDate') && isFieldEditable('faspTime'));
  const isCoordsEditable = !isModifyMode || (activeModificationChecklist.includes('departure_fasp_coords') && isFieldEditable('faspLatDeg')); // Check one field as representative
  const isCourseEditable = !isModifyMode || (activeModificationChecklist.includes('departure_fasp_course') && isFieldEditable('faspCourse'));

  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">FASP Details</legend>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="faspDate" className="block text-sm font-medium text-gray-700">
            FASP Date
          </label>
          <input
            type="date"
            id="faspDate"
            name="faspDate"
            value={formData.faspDate || ''}
            onChange={handleChange}
            required
            readOnly={!isDateTimeEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isDateTimeEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="faspTime" className="block text-sm font-medium text-gray-700">
            FASP Time
          </label>
          <input
            type="time"
            id="faspTime"
            name="faspTime"
            value={formData.faspTime || ''}
            onChange={handleChange}
            required
            readOnly={!isDateTimeEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isDateTimeEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        {/* Empty div for grid alignment if needed, or adjust col-span */}
        <div className="md:col-span-1"></div>

        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <CoordinateInputGroup
            label="FASP Latitude"
            idPrefix="faspLat"
            degreeValue={formData.faspLatDeg ?? ''}
            minuteValue={formData.faspLatMin ?? ''}
            directionValue={formData.faspLatDir ?? 'N'}
            onDegreeChange={(e) => handleCoordinateChange('faspLat', 'Deg', e.target.value)}
            onMinuteChange={(e) => handleCoordinateChange('faspLat', 'Min', e.target.value)}
            onDirectionChange={(e) => handleCoordinateChange('faspLat', 'Dir', e.target.value)}
            directionOptions={['N', 'S']}
            required={true}
            readOnly={!isCoordsEditable} // Use combined flag
            disabled={!isCoordsEditable} // Ensure input is visually disabled too
          />
          <CoordinateInputGroup
            label="FASP Longitude"
            idPrefix="faspLon"
            degreeValue={formData.faspLonDeg ?? ''}
            minuteValue={formData.faspLonMin ?? ''}
            directionValue={formData.faspLonDir ?? 'E'}
            onDegreeChange={(e) => handleCoordinateChange('faspLon', 'Deg', e.target.value)}
            onMinuteChange={(e) => handleCoordinateChange('faspLon', 'Min', e.target.value)}
            onDirectionChange={(e) => handleCoordinateChange('faspLon', 'Dir', e.target.value)}
            directionOptions={['E', 'W']}
            required={true}
            readOnly={!isCoordsEditable} // Use combined flag
            disabled={!isCoordsEditable} // Ensure input is visually disabled too
          />
        </div>
        <div>
          <label htmlFor="faspCourse" className="block text-sm font-medium text-gray-700">
            FASP Course (°)
          </label>
          <input
            type="number"
            id="faspCourse"
            name="faspCourse"
            value={formData.faspCourse || ''}
            onChange={handleChange}
            required
            min="0"
            max="360"
            readOnly={!isCourseEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isCourseEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
      </div>
    </fieldset>
  );
};

export default FASPSection;