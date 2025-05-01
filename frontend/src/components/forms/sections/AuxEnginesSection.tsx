import React from 'react';
import { AuxEngineData } from '../../../types/report'; // Assuming type is in this path

// Define the props for the component
interface AuxEnginesSectionProps {
  auxEngines: AuxEngineData[];
  handleAuxEngineChange: (index: number, field: keyof Omit<AuxEngineData, 'engineName'>, value: string) => void;
}

const AuxEnginesSection: React.FC<AuxEnginesSectionProps> = ({
  auxEngines,
  handleAuxEngineChange,
}) => {
  return (
    <>
      <h4 className="text-md font-semibold mb-2 text-gray-800">Auxiliary Engines (DG1, DG2, V1)</h4>
      <div className="space-y-4">
        {auxEngines?.map((aux, index) => (
          <div key={aux.engineName} className={`border-b pb-4 last:border-b-0 ${index > 0 ? 'opacity-70' : ''}`}>
            <h4 className="text-md font-semibold mb-2">{aux.engineName} {index > 0 ? '(Optional)' : '(Required)'}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor={`aux-${aux.engineName}-load`} className="block text-xs font-medium text-gray-600">Load (%)</label>
                <input
                  type="number" step="1" id={`aux-${aux.engineName}-load`} name={`aux-${aux.engineName}-load`}
                  value={aux.load ?? ''}
                  onChange={(e) => handleAuxEngineChange(index, 'load', e.target.value)}
                  min="0" max="100"
                  className="mt-1 block w-full p-1 border border-gray-300 rounded shadow-sm text-sm"
                />
              </div>
              <div>
                <label htmlFor={`aux-${aux.engineName}-kw`} className="block text-xs font-medium text-gray-600">KW</label>
                <input
                  type="number" step="0.1" id={`aux-${aux.engineName}-kw`} name={`aux-${aux.engineName}-kw`}
                  value={aux.kw ?? ''}
                  onChange={(e) => handleAuxEngineChange(index, 'kw', e.target.value)}
                  min="0"
                  className="mt-1 block w-full p-1 border border-gray-300 rounded shadow-sm text-sm"
                />
              </div>
              <div>
                <label htmlFor={`aux-${aux.engineName}-foPress`} className="block text-xs font-medium text-gray-600">FO Press (bar)</label>
                <input
                  type="number" step="0.1" id={`aux-${aux.engineName}-foPress`} name={`aux-${aux.engineName}-foPress`}
                  value={aux.foPress ?? ''}
                  onChange={(e) => handleAuxEngineChange(index, 'foPress', e.target.value)}
                  min="0"
                  className="mt-1 block w-full p-1 border border-gray-300 rounded shadow-sm text-sm"
                />
              </div>
              <div>
                <label htmlFor={`aux-${aux.engineName}-lubOilPress`} className="block text-xs font-medium text-gray-600">LO Press (bar)</label>
                <input
                  type="number" step="0.1" id={`aux-${aux.engineName}-lubOilPress`} name={`aux-${aux.engineName}-lubOilPress`}
                  value={aux.lubOilPress ?? ''}
                  onChange={(e) => handleAuxEngineChange(index, 'lubOilPress', e.target.value)}
                  min="0"
                  className="mt-1 block w-full p-1 border border-gray-300 rounded shadow-sm text-sm"
                />
              </div>
              <div>
                <label htmlFor={`aux-${aux.engineName}-waterTemp`} className="block text-xs font-medium text-gray-600">Water Temp (°C)</label>
                <input
                  type="number" step="0.1" id={`aux-${aux.engineName}-waterTemp`} name={`aux-${aux.engineName}-waterTemp`}
                  value={aux.waterTemp ?? ''}
                  onChange={(e) => handleAuxEngineChange(index, 'waterTemp', e.target.value)}
                  className="mt-1 block w-full p-1 border border-gray-300 rounded shadow-sm text-sm"
                />
              </div>
              <div>
                <label htmlFor={`aux-${aux.engineName}-dailyRunHour`} className="block text-xs font-medium text-gray-600">Daily Run (hrs)</label>
                <input
                  type="number" step="0.1" id={`aux-${aux.engineName}-dailyRunHour`} name={`aux-${aux.engineName}-dailyRunHour`}
                  value={aux.dailyRunHour ?? ''}
                  onChange={(e) => handleAuxEngineChange(index, 'dailyRunHour', e.target.value)}
                  min="0" max="24"
                  className="mt-1 block w-full p-1 border border-gray-300 rounded shadow-sm text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AuxEnginesSection;
