import React, { ChangeEvent } from 'react';
import CoordinateInputGroup from '../../CoordinateInputGroup'; // Adjusted path
import { PassageState } from '../../../../types/report'; // Assuming PassageState is 'SOSP' | 'ROSP' | '' | null

interface PassageStateSectionProps {
  formData: {
    passageState?: PassageState | null; // Optional or can be null/empty string
    sospDate?: string;
    sospTime?: string;
    sospLatDeg?: string;
    sospLatMin?: string;
    sospLatDir?: 'N' | 'S';
    sospLonDeg?: string;
    sospLonMin?: string;
    sospLonDir?: 'E' | 'W';
    sospCourse?: string;
    rospDate?: string;
    rospTime?: string;
    rospLatDeg?: string;
    rospLatMin?: string;
    rospLatDir?: 'N' | 'S';
    rospLonDeg?: string;
    rospLonMin?: string;
    rospLonDir?: 'E' | 'W';
    rospCourse?: string;
  };
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleCoordinateChange: (
    prefix: 'sospLat' | 'sospLon' | 'rospLat' | 'rospLon',
    part: 'Deg' | 'Min' | 'Dir',
    value: string
  ) => void;
  isFieldEditable?: (fieldName: string) => boolean;
  isModifyMode?: boolean;
  prevNoonState?: PassageState | null; // To manage SOSP/ROSP logic
}

const PassageStateSection: React.FC<PassageStateSectionProps> = ({
  formData,
  handleChange,
  handleCoordinateChange,
  isFieldEditable = () => true,
  isModifyMode = false,
  prevNoonState,
}) => {
  const isPassageStateEditable = !isModifyMode || isFieldEditable('passageState');
  const isSospEditable = !isModifyMode || isFieldEditable('sospDate'); // Check one SOSP field
  const isRospEditable = !isModifyMode || isFieldEditable('rospDate'); // Check one ROSP field

  return (
    <fieldset className="border p-4 rounded">
      <legend className="text-lg font-medium px-2">Passage State</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="passageState" className="block text-sm font-medium text-gray-700">
            Passage State (SOSP/ROSP - Optional)
          </label>
          <select
            id="passageState"
            name="passageState"
            value={formData.passageState ?? ''}
            onChange={handleChange}
            disabled={!isPassageStateEditable}
            className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${
              !isPassageStateEditable ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="" disabled={prevNoonState === 'SOSP' && !isPassageStateEditable}>
              -- Select SOSP/ROSP (Optional) --
            </option>
            <option value="SOSP">SOSP</option>
            <option value="ROSP" disabled={prevNoonState !== 'SOSP' && !isPassageStateEditable}>
              ROSP (Only after SOSP)
            </option>
          </select>
          {prevNoonState === 'SOSP' && (
            <p className="text-xs text-blue-600 mt-1">SOSP or ROSP required after previous SOSP.</p>
          )}
          {prevNoonState !== 'SOSP' && formData.passageState === 'ROSP' && (
             <p className="text-xs text-orange-600 mt-1">ROSP is typically selected only after an SOSP.</p>
          )}
        </div>
      </div>

      {formData.passageState === 'SOSP' && (
        <div className="p-3 mt-4 bg-yellow-50 border border-yellow-200 rounded space-y-4">
          <p className="text-sm text-yellow-700 font-medium">SOSP Details Required</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">SOSP Date</label>
              <input type="date" name="sospDate" value={formData.sospDate ?? ''} onChange={handleChange} required readOnly={!isSospEditable} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isSospEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">SOSP Time</label>
              <input type="time" name="sospTime" value={formData.sospTime ?? ''} onChange={handleChange} required readOnly={!isSospEditable} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isSospEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CoordinateInputGroup label="SOSP Latitude" idPrefix="sospLat" degreeValue={formData.sospLatDeg ?? ''} minuteValue={formData.sospLatMin ?? ''} directionValue={formData.sospLatDir ?? 'N'} onDegreeChange={(e) => handleCoordinateChange('sospLat', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('sospLat', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('sospLat', 'Dir', e.target.value)} directionOptions={['N', 'S']} required={true} readOnly={!isSospEditable} disabled={!isSospEditable} />
            <CoordinateInputGroup label="SOSP Longitude" idPrefix="sospLon" degreeValue={formData.sospLonDeg ?? ''} minuteValue={formData.sospLonMin ?? ''} directionValue={formData.sospLonDir ?? 'E'} onDegreeChange={(e) => handleCoordinateChange('sospLon', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('sospLon', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('sospLon', 'Dir', e.target.value)} directionOptions={['E', 'W']} required={true} readOnly={!isSospEditable} disabled={!isSospEditable} />
            <div>
              <label className="block text-sm font-medium text-gray-700">SOSP Course (°)</label>
              <input type="number" step="any" name="sospCourse" value={formData.sospCourse ?? ''} onChange={handleChange} required min="0" max="360" readOnly={!isSospEditable} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isSospEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
            </div>
          </div>
        </div>
      )}

      {formData.passageState === 'ROSP' && (
        <div className="p-3 mt-4 bg-green-50 border border-green-200 rounded space-y-4">
          <p className="text-sm text-green-700 font-medium">ROSP Details Required</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ROSP Date</label>
              <input type="date" name="rospDate" value={formData.rospDate ?? ''} onChange={handleChange} required readOnly={!isRospEditable} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isRospEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ROSP Time</label>
              <input type="time" name="rospTime" value={formData.rospTime ?? ''} onChange={handleChange} required readOnly={!isRospEditable} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isRospEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CoordinateInputGroup label="ROSP Latitude" idPrefix="rospLat" degreeValue={formData.rospLatDeg ?? ''} minuteValue={formData.rospLatMin ?? ''} directionValue={formData.rospLatDir ?? 'N'} onDegreeChange={(e) => handleCoordinateChange('rospLat', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('rospLat', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('rospLat', 'Dir', e.target.value)} directionOptions={['N', 'S']} required={true} readOnly={!isRospEditable} disabled={!isRospEditable} />
            <CoordinateInputGroup label="ROSP Longitude" idPrefix="rospLon" degreeValue={formData.rospLonDeg ?? ''} minuteValue={formData.rospLonMin ?? ''} directionValue={formData.rospLonDir ?? 'E'} onDegreeChange={(e) => handleCoordinateChange('rospLon', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('rospLon', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('rospLon', 'Dir', e.target.value)} directionOptions={['E', 'W']} required={true} readOnly={!isRospEditable} disabled={!isRospEditable} />
            <div>
              <label className="block text-sm font-medium text-gray-700">ROSP Course (°)</label>
              <input type="number" step="any" name="rospCourse" value={formData.rospCourse ?? ''} onChange={handleChange} required min="0" max="360" readOnly={!isRospEditable} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${!isRospEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
};

export default PassageStateSection;