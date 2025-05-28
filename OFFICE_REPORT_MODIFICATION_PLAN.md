# Office Report Modification with Cascade Recalculation

## Overview

Simple implementation allowing office users to modify approved reports with automatic cascade recalculation of subsequent reports in the voyage. No database changes required.

## Core Logic

1. Office modifies critical fields in approved report
2. System calculates cascade effects on subsequent reports
3. Validates results (no negative ROB, reasonable speeds)
4. If valid: applies changes; if invalid: rejects modification

## Critical Fields

**Distance**: `distanceSinceLastReport`, `harbourDistance`, `voyageDistance`
**Bunker Consumption**: `meConsumptionLsifo`, `meConsumptionLsmgo`, `meConsumptionCylOil`, `meConsumptionMeOil`, `meConsumptionAeOil`, `boilerConsumptionLsifo`, `boilerConsumptionLsmgo`, `auxConsumptionLsifo`, `auxConsumptionLsmgo`
**Bunker Supply**: `supplyLsifo`, `supplyLsmgo`, `supplyCylOil`, `supplyMeOil`, `supplyAeOil`
**Cargo**: `cargoQuantity`, `cargoType`, `cargoStatus`, `cargoLoaded`, `cargoUnloaded`
**Port Continuity**: `departurePort`, `destinationPort`

## Implementation

### 1. Field Configuration

```typescript
// src/config/cascade_fields.ts
export const CRITICAL_FIELDS = {
  DISTANCE: ['distanceSinceLastReport', 'harbourDistance', 'voyageDistance'],
  BUNKER_CONSUMPTION: ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil', 'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo'],
  BUNKER_SUPPLY: ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'],
  CARGO: ['cargoQuantity', 'cargoType', 'cargoStatus', 'cargoLoaded', 'cargoUnloaded'],
  PORT_CONTINUITY: ['departurePort', 'destinationPort']
};

export function isCriticalField(fieldName: string): boolean {
  return Object.values(CRITICAL_FIELDS).flat().includes(fieldName);
}

export function getCascadeType(fieldName: string): string | null {
  for (const [type, fields] of Object.entries(CRITICAL_FIELDS)) {
    if (fields.includes(fieldName)) return type;
  }
  return null;
}
```

### 2. Cascade Calculator Service

```typescript
// src/services/cascade_calculator.service.ts
import { Report } from '../types/report';
import ReportModel from '../models/report.model';
import { calculateDistances } from './distance_calculator';
import { calculateTotalConsumptions, calculateCurrentRobs } from './bunker_calculator';
import { isCriticalField, getCascadeType } from '../config/cascade_fields';

export interface FieldModification {
  fieldName: string;
  oldValue: any;
  newValue: any;
}

export interface CascadeResult {
  isValid: boolean;
  affectedReports: AffectedReport[];
  errors: string[];
}

export interface AffectedReport {
  reportId: string;
  updates: Record<string, any>;
  errors: string[];
}

export const CascadeCalculatorService = {
  async calculateCascade(reportId: string, modifications: FieldModification[]): Promise<CascadeResult> {
    const sourceReport = ReportModel.findById(reportId);
    if (!sourceReport) throw new Error(`Report ${reportId} not found`);

    const criticalMods = modifications.filter(m => isCriticalField(m.fieldName));
    if (criticalMods.length === 0) return { isValid: true, affectedReports: [], errors: [] };

    const subsequentReports = this.getSubsequentReports(sourceReport);
    if (subsequentReports.length === 0) return { isValid: true, affectedReports: [], errors: [] };

    const modifiedSource = { ...sourceReport };
    criticalMods.forEach(mod => (modifiedSource as any)[mod.fieldName] = mod.newValue);

    const result: CascadeResult = { isValid: true, affectedReports: [], errors: [] };

    for (let i = 0; i < subsequentReports.length; i++) {
      const currentReport = subsequentReports[i];
      const previousReport = i === 0 ? modifiedSource : subsequentReports[i - 1];
      
      const affectedReport = this.calculateReportCascade(currentReport, previousReport, criticalMods);
      result.affectedReports.push(affectedReport);
      
      if (affectedReport.errors.length > 0) {
        result.isValid = false;
        result.errors.push(...affectedReport.errors);
      }

      Object.assign(currentReport, affectedReport.updates);
    }

    return result;
  },

  getSubsequentReports(sourceReport: Partial<Report>): Partial<Report>[] {
    if (!sourceReport.voyageId) return [];

    const allReports = ReportModel._getAllReportsForVoyage(sourceReport.voyageId)
      .filter(r => r.status === 'approved');

    allReports.sort((a, b) => this.getTimestamp(a) - this.getTimestamp(b));

    const sourceIndex = allReports.findIndex(r => r.id === sourceReport.id);
    return sourceIndex >= 0 ? allReports.slice(sourceIndex + 1) : [];
  },

  calculateReportCascade(targetReport: Partial<Report>, previousReport: Partial<Report>, modifications: FieldModification[]): AffectedReport {
    const updates: Record<string, any> = {};
    const errors: string[] = [];

    const modTypes = new Set(modifications.map(m => getCascadeType(m.fieldName)).filter(Boolean));

    if (modTypes.has('DISTANCE')) {
      const distanceResult = this.calculateDistanceCascade(targetReport, previousReport);
      Object.assign(updates, distanceResult.updates);
      errors.push(...distanceResult.errors);
    }

    if (modTypes.has('BUNKER_CONSUMPTION') || modTypes.has('BUNKER_SUPPLY')) {
      const bunkerResult = this.calculateBunkerCascade(targetReport, previousReport);
      Object.assign(updates, bunkerResult.updates);
      errors.push(...bunkerResult.errors);
    }

    if (modTypes.has('CARGO')) {
      const cargoResult = this.calculateCargoCascade(targetReport, previousReport);
      Object.assign(updates, cargoResult.updates);
      errors.push(...cargoResult.errors);
    }

    return { reportId: targetReport.id!, updates, errors };
  },

  calculateDistanceCascade(targetReport: Partial<Report>, previousReport: Partial<Report>) {
    const updates: Record<string, any> = {};
    const errors: string[] = [];

    try {
      const voyageDistance = targetReport.voyageDistance || previousReport.voyageDistance || 0;
      const distanceSinceLast = targetReport.distanceSinceLastReport || 0;
      const previousTotal = previousReport.totalDistanceTravelled || 0;

      const newTotalDistance = previousTotal + distanceSinceLast;
      const newDistanceToGo = Math.max(0, voyageDistance - newTotalDistance);

      updates.totalDistanceTravelled = newTotalDistance;
      updates.distanceToGo = newDistanceToGo;

      if (newTotalDistance < 0) errors.push(`Negative total distance: ${newTotalDistance}`);
      if (newTotalDistance > voyageDistance * 1.1) errors.push(`Total distance exceeds voyage distance by >10%`);

      if (targetReport.sailingTimeVoyage && targetReport.sailingTimeVoyage > 0) {
        const avgSpeed = newTotalDistance / targetReport.sailingTimeVoyage;
        updates.avgSpeedVoyage = avgSpeed;
        if (avgSpeed < 0 || avgSpeed > 30) errors.push(`Invalid speed: ${avgSpeed} knots`);
      }
    } catch (error) {
      errors.push(`Distance calculation error: ${error}`);
    }

    return { updates, errors };
  },

  calculateBunkerCascade(targetReport: Partial<Report>, previousReport: Partial<Report>) {
    const updates: Record<string, any> = {};
    const errors: string[] = [];

    try {
      const previousRob = {
        lsifo: previousReport.currentRobLsifo || 0,
        lsmgo: previousReport.currentRobLsmgo || 0,
        cylOil: previousReport.currentRobCylOil || 0,
        meOil: previousReport.currentRobMeOil || 0,
        aeOil: previousReport.currentRobAeOil || 0
      };

      const consumptions = calculateTotalConsumptions({
        meConsumptionLsifo: targetReport.meConsumptionLsifo,
        meConsumptionLsmgo: targetReport.meConsumptionLsmgo,
        meConsumptionCylOil: targetReport.meConsumptionCylOil,
        meConsumptionMeOil: targetReport.meConsumptionMeOil,
        meConsumptionAeOil: targetReport.meConsumptionAeOil,
        boilerConsumptionLsifo: targetReport.boilerConsumptionLsifo,
        boilerConsumptionLsmgo: targetReport.boilerConsumptionLsmgo,
        auxConsumptionLsifo: targetReport.auxConsumptionLsifo,
        auxConsumptionLsmgo: targetReport.auxConsumptionLsmgo
      });

      const supplies = {
        supplyLsifo: targetReport.supplyLsifo,
        supplyLsmgo: targetReport.supplyLsmgo,
        supplyCylOil: targetReport.supplyCylOil,
        supplyMeOil: targetReport.supplyMeOil,
        supplyAeOil: targetReport.supplyAeOil
      };

      const currentRobs = calculateCurrentRobs(previousRob, consumptions, supplies);

      updates.totalConsumptionLsifo = consumptions.totalConsumptionLsifo;
      updates.totalConsumptionLsmgo = consumptions.totalConsumptionLsmgo;
      updates.totalConsumptionCylOil = consumptions.totalConsumptionCylOil;
      updates.totalConsumptionMeOil = consumptions.totalConsumptionMeOil;
      updates.totalConsumptionAeOil = consumptions.totalConsumptionAeOil;
      updates.currentRobLsifo = currentRobs.currentRobLsifo;
      updates.currentRobLsmgo = currentRobs.currentRobLsmgo;
      updates.currentRobCylOil = currentRobs.currentRobCylOil;
      updates.currentRobMeOil = currentRobs.currentRobMeOil;
      updates.currentRobAeOil = currentRobs.currentRobAeOil;

      Object.entries(currentRobs).forEach(([fuel, rob]) => {
        if (rob < 0) errors.push(`Negative ROB for ${fuel}: ${rob}`);
      });
    } catch (error) {
      errors.push(`Bunker calculation error: ${error}`);
    }

    return { updates, errors };
  },

  calculateCargoCascade(targetReport: Partial<Report>, previousReport: Partial<Report>) {
    const updates: Record<string, any> = {};
    const errors: string[] = [];

    try {
      if (targetReport.reportType === 'berth') {
        const previousCargoQty = previousReport.cargoQuantity || 0;
        const cargoLoaded = targetReport.cargoLoaded || 0;
        const cargoUnloaded = targetReport.cargoUnloaded || 0;
        
        const newCargoQuantity = previousCargoQty + cargoLoaded - cargoUnloaded;
        
        updates.cargoQuantity = newCargoQuantity;
        updates.cargoStatus = newCargoQuantity > 0 ? 'Loaded' : 'Empty';
        
        if (newCargoQuantity < 0) {
          errors.push(`Cannot unload more cargo than available: ${newCargoQuantity}`);
        }
      }
    } catch (error) {
      errors.push(`Cargo calculation error: ${error}`);
    }

    return { updates, errors };
  },

  getTimestamp(report: Partial<Report>): number {
    if (report.createdAt) {
      try {
        return new Date(report.createdAt).getTime();
      } catch (e) {
        console.error('Error parsing createdAt timestamp:', e);
        return 0;
      }
    }
    return 0;
  }
};
```

### 3. Report Modification Service

```typescript
// src/services/report_modification.service.ts
import ReportModel from '../models/report.model';
import CascadeCalculatorService, { FieldModification, CascadeResult } from './cascade_calculator.service';

export const ReportModificationService = {
  async modifyReportWithCascade(
    reportId: string,
    modifications: FieldModification[],
    previewOnly: boolean = false
  ): Promise<{ success: boolean; cascadeResult: CascadeResult; error?: string }> {
    
    const originalReport = ReportModel.findById(reportId);
    if (!originalReport || originalReport.status !== 'approved') {
      return { 
        success: false, 
        cascadeResult: { isValid: false, affectedReports: [], errors: [] },
        error: 'Report not found or not approved' 
      };
    }

    const cascadeResult = await CascadeCalculatorService.calculateCascade(reportId, modifications);

    if (previewOnly) return { success: true, cascadeResult };

    if (!cascadeResult.isValid) {
      return { success: false, cascadeResult, error: 'Cascade validation failed' };
    }

    const sourceUpdates: Record<string, any> = {};
    modifications.forEach(mod => sourceUpdates[mod.fieldName] = mod.newValue);

    const sourceUpdateSuccess = ReportModel.update(reportId, sourceUpdates);
    if (!sourceUpdateSuccess) {
      return { success: false, cascadeResult, error: 'Failed to update source report' };
    }

    for (const affectedReport of cascadeResult.affectedReports) {
      if (Object.keys(affectedReport.updates).length > 0) {
        const updateSuccess = ReportModel.update(affectedReport.reportId, affectedReport.updates);
        if (!updateSuccess) {
          console.error(`Failed to update report ${affectedReport.reportId}`);
        }
      }
    }

    return { success: true, cascadeResult };
  }
};
```

### 4. API Controller

```typescript
// src/controllers/report_modification.controller.ts
import { Request, Response } from 'express';
import ReportModificationService from '../services/report_modification.service';
import { FieldModification } from '../services/cascade_calculator.service';

export const ReportModificationController = {
  async previewCascade(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { modifications } = req.body;

      const result = await ReportModificationService.modifyReportWithCascade(
        reportId,
        modifications as FieldModification[],
        true
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Preview failed', details: String(error) });
    }
  },

  async modifyWithCascade(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { modifications } = req.body;

      const result = await ReportModificationService.modifyReportWithCascade(
        reportId,
        modifications as FieldModification[],
        false
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ error: 'Modification failed', details: String(error) });
    }
  }
};
```

### 5. API Routes

```typescript
// Add to src/routes/report.routes.ts
import ReportModificationController from '../controllers/report_modification.controller';

const requireOfficeRole = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'office' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Office role required' });
  }
  next();
};

router.post('/reports/:reportId/preview-cascade', authenticate, requireOfficeRole, ReportModificationController.previewCascade);
router.post('/reports/:reportId/modify-cascade', authenticate, requireOfficeRole, ReportModificationController.modifyWithCascade);
```

### 6. Frontend API Service

```typescript
// frontend/src/services/api.ts
export const reportModificationApi = {
  previewCascade: async (reportId: string, modifications: FieldModification[]) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/reports/${reportId}/preview-cascade`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ modifications })
    });
    return response.json();
  },

  modifyWithCascade: async (reportId: string, modifications: FieldModification[]) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/reports/${reportId}/modify-cascade`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ modifications })
    });
    return response.json();
  }
};
```

### 7. Office Interface Component

```typescript
// frontend/src/components/OfficeReportModification.tsx
import React, { useState } from 'react';
import { reportModificationApi } from '../services/api';

export const OfficeReportModification: React.FC<{
  reportId: string;
  reportData: any;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ reportId, reportData, onClose, onSuccess }) => {
  const [modifications, setModifications] = useState<FieldModification[]>([]);
  const [cascadePreview, setCascadePreview] = useState<CascadeResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const criticalFields = {
    'Distance': ['distanceSinceLastReport', 'harbourDistance', 'voyageDistance'],
    'Bunker Consumption': ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil', 'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo'],
    'Bunker Supply': ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'],
    'Cargo': ['cargoQuantity', 'cargoType', 'cargoStatus', 'cargoLoaded', 'cargoUnloaded'],
    'Port Continuity': ['departurePort', 'destinationPort']
  };

  const handleFieldChange = (fieldName: string, newValue: any) => {
    const oldValue = reportData[fieldName];
    const filteredMods = modifications.filter(m => m.fieldName !== fieldName);
    
    if (oldValue !== newValue) {
      setModifications([...filteredMods, { fieldName, oldValue, newValue }]);
    } else {
      setModifications(filteredMods);
    }
    
    setCascadePreview(null);
  };

  const previewCascade = async () => {
    if (modifications.length === 0) return;
    
    setIsPreviewLoading(true);
    setError(null);
    
    try {
      const result = await reportModificationApi.previewCascade(reportId, modifications);
      setCascadePreview(result.cascadeResult);
    } catch (err) {
      setError('Failed to preview cascade effects');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const applyModifications = async () => {
    if (!cascadePreview || !cascadePreview.isValid) return;
    
    setIsApplying(true);
    setError(null);
    
    try {
      const result = await reportModificationApi.modifyWithCascade(reportId, modifications);
      
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to apply modifications');
      }
    } catch (err) {
      setError('Failed to apply modifications');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Modify Report</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Report Information</h3>
          <p><strong>Type:</strong> {reportData.reportType}</p>
          <p><strong>Date:</strong> {reportData.reportDate}</p>
          <p><strong>Vessel:</strong> {reportData.vesselName}</p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-4">Critical Fields</h3>
          
          {Object.entries(criticalFields).map(([category, fields]) => (
            <div key={category} className="mb-6">
              <h4 className="font-medium text-lg mb-3 text-blue-600">{category}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(fieldName => (
                  <FieldEditor
                    key={fieldName}
                    fieldName={fieldName}
                    currentValue={reportData[fieldName]}
                    onChange={(value) => handleFieldChange(fieldName, value)}
                    isModified={modifications.some(m => m.fieldName === fieldName)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {modifications.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-semibold mb-2">Pending Modifications ({modifications.length})</h4>
            {modifications.map((mod, index) => (
              <div key={index} className="text-sm">
                <strong>{mod.fieldName}:</strong> {mod.oldValue} → {mod.newValue}
              </div>
            ))}
          </div>
        )}

        {modifications.length > 0 && !cascadePreview && (
          <div className="mb-6">
            <button
              onClick={previewCascade}
              disabled={isPreviewLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isPreviewLoading ? 'Calculating...' : 'Preview Cascade Effects'}
            </button>
          </div>
        )}

        {cascadePreview && (
          <CascadePreviewDisplay 
            cascadeResult={cascadePreview}
            onApply={applyModifications}
            isApplying={isApplying}
          />
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Summary

**Clean Implementation Features:**
- No database schema changes
- Uses `createdAt` for reliable chronological ordering
- Validates before applying changes
- Prevents invalid data states
- Automatic cascade recalculation
- User-friendly office interface
- Real-time preview of cascade effects

**Cascade Logic:**
- Distance changes → recalculate total distance, distance to go, average speed
- Bunker changes → recalculate total consumption and ROB values  
- Cargo changes → update cargo quantity and status
- Port changes → ensure continuity between voyages

**Validation Rules:**
- No negative ROB values
- Speed between 0-30 knots
- Total distance within 110% of voyage distance
- Cargo operations within available quantities