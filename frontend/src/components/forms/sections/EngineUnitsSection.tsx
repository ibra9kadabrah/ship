import React from 'react';
import { EngineUnitData } from '../../../types/report'; // Assuming type is in this path

// Define the props for the component
interface EngineUnitsSectionProps {
  engineUnits: EngineUnitData[];
  handleEngineUnitChange: (index: number, field: keyof Omit<EngineUnitData, 'unitNumber'>, value: string) => void;
  isReadOnly?: boolean;
  disabled?: boolean; // For disabling the whole section
}

const EngineUnitsSection: React.FC<EngineUnitsSectionProps> = ({
  engineUnits,
  handleEngineUnitChange,
  isReadOnly = false,
  disabled = false,
}) => {
  // If the whole section is disabled, all inner fields are read-only.
  const fieldReadOnly = isReadOnly || disabled;
  return (
    <>
      <h4 className="text-md font-semibold mb-2 text-gray-800">Engine Units (1-8)</h4>
      <div className="space-y-4 mb-4">
        {engineUnits?.map((unit, index) => (
          <div key={unit.unitNumber} className={`border-b pb-4 last:border-b-0 ${index >= 6 ? 'opacity-70' : ''}`}>
            <h4 className="text-md font-semibold mb-2">Unit #{unit.unitNumber} {index >= 6 ? '(Optional)' : ''}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label htmlFor={`unit-${unit.unitNumber}-exhaustTemp`} className="block text-xs font-medium text-gray-600">Exh. Temp (°C)</label>
                <input
                  type="number" step="1" id={`unit-${unit.unitNumber}-exhaustTemp`} name={`unit-${unit.unitNumber}-exhaustTemp`}
                  value={unit.exhaustTemp ?? ''}
                  onChange={(e) => handleEngineUnitChange(index, 'exhaustTemp', e.target.value)}
                  readOnly={fieldReadOnly}
                  className={`mt-1 block w-full p-1 border border-gray-300 rounded shadow-sm text-sm ${fieldReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label htmlFor={`unit-${unit.unitNumber}-underPistonAir`} className="block text-xs font-medium text-gray-600">Und. Piston Air</label>
                <input
                  type="number" step="0.1" id={`unit-${unit.unitNumber}-underPistonAir`} name={`unit-${unit.unitNumber}-underPistonAir`}
                  value={unit.underPistonAir ?? ''}
                  onChange={(e) => handleEngineUnitChange(index, 'underPistonAir', e.target.value)}
                  readOnly={fieldReadOnly}
                  className={`mt-1 block w-full p-1 border border-gray-300 rounded shadow-sm text-sm ${fieldReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label htmlFor={`unit-${unit.unitNumber}-pcoOutletTemp`} className="block text-xs font-medium text-gray-600">PCO Outlet (°C)</label>
                <input
                  type="number" step="0.1" id={`unit-${unit.unitNumber}-pcoOutletTemp`} name={`unit-${unit.unitNumber}-pcoOutletTemp`}
                  value={unit.pcoOutletTemp ?? ''}
                  onChange={(e) => handleEngineUnitChange(index, 'pcoOutletTemp', e.target.value)}
                  readOnly={fieldReadOnly}
                  className={`mt-1 block w-full p-1 border border-gray-300 rounded shadow-sm text-sm ${fieldReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label htmlFor={`unit-${unit.unitNumber}-jcfwOutletTemp`} className="block text-xs font-medium text-gray-600">JCFW Outlet (°C)</label>
                <input
                  type="number" step="0.1" id={`unit-${unit.unitNumber}-jcfwOutletTemp`} name={`unit-${unit.unitNumber}-jcfwOutletTemp`}
                  value={unit.jcfwOutletTemp ?? ''}
                  onChange={(e) => handleEngineUnitChange(index, 'jcfwOutletTemp', e.target.value)}
                  readOnly={fieldReadOnly}
                  className={`mt-1 block w-full p-1 border border-gray-300 rounded shadow-sm text-sm ${fieldReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default EngineUnitsSection;
