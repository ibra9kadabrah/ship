import React, { ChangeEvent } from 'react';
import CoordinateInputGroup from '../../CoordinateInputGroup'; // Adjusted path

interface BerthDetailsSectionProps {
  formData: {
    berthDate: string;
    berthTime: string;
    berthLatDeg: string;
    berthLatMin: string;
    berthLatDir: 'N' | 'S';
    berthLonDeg: string;
    berthLonMin: string;
    berthLonDir: 'E' | 'W';
    berthNumber: string;
  };
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleCoordinateChange: (
    prefix: 'berthLat' | 'berthLon', 
    part: 'Deg' | 'Min' | 'Dir', 
    value: string
  ) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
  // activeModificationChecklist might be needed for granular control
}

const BerthDetailsSection: React.FC<BerthDetailsSectionProps> = ({
  formData,
  handleChange,
  handleCoordinateChange,
  isFieldEditable = () => true,
  isModifyMode = false
}) => {
  // Simplified editability for the whole section for now.
  const isSectionGenerallyEditable = !isModifyMode || isFieldEditable('berthDate'); 

  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">Berth Details</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="berthDate" className="block text-sm font-medium text-gray-700">Berth Date</label>
          <input
            type="date"
            id="berthDate"
            name="berthDate"
            value={formData.berthDate}
            onChange={handleChange}
            required
            readOnly={!isSectionGenerallyEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
              !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          />
        </div>
        <div>
          <label htmlFor="berthTime" className="block text-sm font-medium text-gray-700">Berth Time</label>
          <input
            type="time"
            id="berthTime"
            name="berthTime"
            value={formData.berthTime}
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
        <CoordinateInputGroup
          label="Berth Latitude"
          idPrefix="berthLat"
          degreeValue={formData.berthLatDeg ?? ''}
          minuteValue={formData.berthLatMin ?? ''}
          directionValue={formData.berthLatDir ?? 'N'}
          onDegreeChange={(e) => handleCoordinateChange('berthLat', 'Deg', e.target.value)}
          onMinuteChange={(e) => handleCoordinateChange('berthLat', 'Min', e.target.value)}
          onDirectionChange={(e) => handleCoordinateChange('berthLat', 'Dir', e.target.value)}
          directionOptions={['N', 'S']}
          required={true}
          readOnly={!isSectionGenerallyEditable}
          disabled={!isSectionGenerallyEditable}
        />
        <CoordinateInputGroup
          label="Berth Longitude"
          idPrefix="berthLon"
          degreeValue={formData.berthLonDeg ?? ''}
          minuteValue={formData.berthLonMin ?? ''}
          directionValue={formData.berthLonDir ?? 'E'}
          onDegreeChange={(e) => handleCoordinateChange('berthLon', 'Deg', e.target.value)}
          onMinuteChange={(e) => handleCoordinateChange('berthLon', 'Min', e.target.value)}
          onDirectionChange={(e) => handleCoordinateChange('berthLon', 'Dir', e.target.value)}
          directionOptions={['E', 'W']}
          required={true}
          readOnly={!isSectionGenerallyEditable}
          disabled={!isSectionGenerallyEditable}
        />
      </div>
      <div className="mt-4">
        <label htmlFor="berthNumber" className="block text-sm font-medium text-gray-700">Berth Number</label>
        <input
          type="text"
          id="berthNumber"
          name="berthNumber"
          value={formData.berthNumber}
          onChange={handleChange}
          required
          readOnly={!isSectionGenerallyEditable}
          className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${
            !isSectionGenerallyEditable ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
      </div>
    </fieldset>
  );
};

export default BerthDetailsSection;