import React, { ChangeEvent } from 'react';

// Define the shape of the data slice this component expects
interface MachineryMEParamsData {
  meFoPressure?: string | number;
  meLubOilPressure?: string | number;
  meFwInletTemp?: string | number;
  meLoInletTemp?: string | number;
  meScavengeAirTemp?: string | number;
  meTcRpm1?: string | number;
  meTcRpm2?: string | number; // Optional
  meTcExhaustTempIn?: string | number;
  meTcExhaustTempOut?: string | number;
  meThrustBearingTemp?: string | number;
  meDailyRunHours?: string | number; // Specific to Noon/Arrival/Berth
  mePresentRpm?: string | number; // Added Present RPM
  meCurrentSpeed?: string | number; // Added Current Speed
}

// Define the props for the component
interface MachineryMEParamsSectionProps {
  formData: MachineryMEParamsData;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isTcRpm2Optional?: boolean; // Flag to control if TC#2 RPM is optional
  includeDailyRunHours?: boolean; // Flag to include ME Daily Run Hours (not in Departure)
  isReadOnly?: boolean;
  disabled?: boolean;
  isFieldEditable?: (fieldName: string) => boolean;
}

const MachineryMEParamsSection: React.FC<MachineryMEParamsSectionProps> = ({
  formData,
  handleChange,
  isTcRpm2Optional = false,
  includeDailyRunHours = true,
  isReadOnly = false,
  disabled = false,
  isFieldEditable,
}) => {
  const getFieldDisabledState = (fieldName: string): boolean => {
    if (disabled) return true;
    if (isFieldEditable) return !isFieldEditable(fieldName);
    return isReadOnly;
  };
  return (
    <>
      <h4 className="text-md font-semibold mb-2 text-gray-800">Main Engine Parameters</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label htmlFor="meFoPressure" className="block text-sm font-medium text-gray-700">FO Press (bar)</label>
          <input
            type="number" step="0.1" id="meFoPressure" name="meFoPressure"
            value={formData.meFoPressure ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('meFoPressure')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meFoPressure') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meLubOilPressure" className="block text-sm font-medium text-gray-700">LO Press (bar)</label>
          <input
            type="number" step="0.1" id="meLubOilPressure" name="meLubOilPressure"
            value={formData.meLubOilPressure ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('meLubOilPressure')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meLubOilPressure') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meFwInletTemp" className="block text-sm font-medium text-gray-700">FW Inlet (°C)</label>
          <input
            type="number" step="0.1" id="meFwInletTemp" name="meFwInletTemp"
            value={formData.meFwInletTemp ?? ''} onChange={handleChange} required
            readOnly={getFieldDisabledState('meFwInletTemp')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meFwInletTemp') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meLoInletTemp" className="block text-sm font-medium text-gray-700">LO Inlet (°C)</label>
          <input
            type="number" step="0.1" id="meLoInletTemp" name="meLoInletTemp"
            value={formData.meLoInletTemp ?? ''} onChange={handleChange} required
            readOnly={getFieldDisabledState('meLoInletTemp')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meLoInletTemp') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meScavengeAirTemp" className="block text-sm font-medium text-gray-700">Scav Air (°C)</label>
          <input
            type="number" step="0.1" id="meScavengeAirTemp" name="meScavengeAirTemp"
            value={formData.meScavengeAirTemp ?? ''} onChange={handleChange} required
            readOnly={getFieldDisabledState('meScavengeAirTemp')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meScavengeAirTemp') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meTcRpm1" className="block text-sm font-medium text-gray-700">TC#1 RPM</label>
          <input
            type="number" id="meTcRpm1" name="meTcRpm1"
            value={formData.meTcRpm1 ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('meTcRpm1')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meTcRpm1') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meTcRpm2" className="block text-sm font-medium text-gray-700">
            TC#2 RPM {isTcRpm2Optional ? '(Optional)' : ''}
          </label>
          <input
            type="number" id="meTcRpm2" name="meTcRpm2"
            value={formData.meTcRpm2 ?? ''} onChange={handleChange} min="0"
            required={!isTcRpm2Optional} // Only required if the flag is false
            readOnly={getFieldDisabledState('meTcRpm2')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meTcRpm2') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meTcExhaustTempIn" className="block text-sm font-medium text-gray-700">TC Exh In (°C)</label>
          <input
            type="number" step="1" id="meTcExhaustTempIn" name="meTcExhaustTempIn"
            value={formData.meTcExhaustTempIn ?? ''} onChange={handleChange} required
            readOnly={getFieldDisabledState('meTcExhaustTempIn')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meTcExhaustTempIn') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meTcExhaustTempOut" className="block text-sm font-medium text-gray-700">TC Exh Out (°C)</label>
          <input
            type="number" step="1" id="meTcExhaustTempOut" name="meTcExhaustTempOut"
            value={formData.meTcExhaustTempOut ?? ''} onChange={handleChange} required
            readOnly={getFieldDisabledState('meTcExhaustTempOut')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meTcExhaustTempOut') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="meThrustBearingTemp" className="block text-sm font-medium text-gray-700">Thrust Brg (°C)</label>
          <input
            type="number" step="0.1" id="meThrustBearingTemp" name="meThrustBearingTemp"
            value={formData.meThrustBearingTemp ?? ''} onChange={handleChange} required
            readOnly={getFieldDisabledState('meThrustBearingTemp')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meThrustBearingTemp') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        {includeDailyRunHours && (
          <div>
            <label htmlFor="meDailyRunHours" className="block text-sm font-medium text-gray-700">ME Daily Run (hrs)</label>
            <input
              type="number" step="0.1" id="meDailyRunHours" name="meDailyRunHours"
              value={formData.meDailyRunHours ?? ''} onChange={handleChange} required min="0" max="24"
              readOnly={getFieldDisabledState('meDailyRunHours')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meDailyRunHours') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>
        )}
        {/* Added Present RPM Input */}
        <div>
          <label htmlFor="mePresentRpm" className="block text-sm font-medium text-gray-700">Present RPM</label>
          <input
            type="number" step="0.1" id="mePresentRpm" name="mePresentRpm"
            value={formData.mePresentRpm ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('mePresentRpm')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('mePresentRpm') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
        {/* Added Current Speed Input */}
        <div>
          <label htmlFor="meCurrentSpeed" className="block text-sm font-medium text-gray-700">Current Speed (knots)</label>
          <input
            type="number" step="0.1" id="meCurrentSpeed" name="meCurrentSpeed"
            value={formData.meCurrentSpeed ?? ''} onChange={handleChange} required min="0"
            readOnly={getFieldDisabledState('meCurrentSpeed')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${getFieldDisabledState('meCurrentSpeed') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>
    </>
  );
};

export default MachineryMEParamsSection;
