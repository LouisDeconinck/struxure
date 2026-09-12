import type { Material, Section } from '../../core/types';
import type { ConcreteDesignResult } from '../types';
import { checkFlexure } from './flexure';
import { checkShear } from './shear';
import { checkColumn } from './columns';

/**
 * Full ACI 318 design check for a concrete element.
 *
 * If axial load is significant (P > 0.1*f'c*Ag), treated as a column.
 * Otherwise, treated as a beam (flexure + shear).
 */
export function designConcreteElement(
  elementId: string,
  axialForce: number,
  shearForce: number,
  moment: number,
  material: Material,
  section: Section
): ConcreteDesignResult {
  const fc = material.fc || 4;
  const b = section.b || section.bf || 12;
  const h = section.h || section.d || 24;
  const Ag = b * h;

  // Check if this is a column (significant axial load)
  const isColumn = Math.abs(axialForce) > 0.1 * fc * Ag;

  if (isColumn) {
    const columnResult = checkColumn(Math.abs(axialForce), Math.abs(moment), material, section);
    return {
      elementId,
      material: 'concrete',
      ratio: columnResult.ratio,
      status: columnResult.ratio <= 1.0 ? 'pass' : 'fail',
      details: {
        flexureRatio: columnResult.ratio,
        shearRatio: 0,
        AsRequired: 0.01 * Ag, // Minimum 1%
        AvRequired: 0,
        phiPn: columnResult.phiPn,
        phiMn: 0, // Not checked — the column interaction covers flexure
        phiVn: 0, // Not checked
      },
    };
  }

  // Beam design
  const flexureResult = checkFlexure(moment, material, section);
  const shearResult = checkShear(shearForce, material, section);

  const governingRatio = Math.max(flexureResult.ratio, shearResult.ratio);

  return {
    elementId,
    material: 'concrete',
    ratio: governingRatio,
    status: governingRatio <= 1.0 ? 'pass' : 'fail',
    details: {
      flexureRatio: flexureResult.ratio,
      shearRatio: shearResult.ratio,
      AsRequired: flexureResult.AsRequired,
      AvRequired: shearResult.AvRequired,
      phiPn: 0, // Not checked — beam branch carries no axial capacity
      phiMn: flexureResult.phiMn,
      phiVn: shearResult.phiVn,
    },
  };
}
