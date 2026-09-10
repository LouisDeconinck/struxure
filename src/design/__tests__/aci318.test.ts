import { describe, it, expect } from 'vitest';
import type { Material, Section } from '../../core/types';
import { checkFlexure } from '../aci318/flexure';
import { checkShear } from '../aci318/shear';
import { checkColumn } from '../aci318/columns';
import { designConcreteElement } from '../aci318';

/**
 * Validation tests for the ACI 318 checks.
 *
 * Reference values are worked from ACI 318-19 provisions by hand, in the units
 * the code uses internally (kips, inches, ksi). The recurring pitfall these
 * guard is unit scaling: ACI writes 2*sqrt(f'c) and 200/fy with f'c and fy in
 * psi, while models here carry f'c in ksi.
 */

const C4000: Material = {
  id: 'concrete-4000', name: "f'c = 4000 psi Concrete", type: 'concrete',
  E: 3605, G: 1502, density: 0.0000868, fc: 4,
};

/** 12 in x 24 in rectangular beam; the modules take d = h - 2.5 in. */
const BEAM_12x24: Section = {
  id: 'R12x24', name: '12x24', A: 288,
  Ix: 13824, Iy: 3456, J: 0,
  Sx: 1152, Sy: 576, Zx: 1728, Zy: 864,
  b: 12, h: 24,
};

const B = 12;
const H = 24;
const D = H - 2.5; // 21.5 in effective depth
const FY = 60; // Grade 60 reinforcement, ksi

describe('ACI 318 — beam flexure (Whitney stress block)', () => {
  it('minimum steel follows 9.6.1.2 with f\'c and fy in psi', () => {
    // As,min = max( 3*sqrt(f'c)/fy , 200/fy ) * bw * d, f'c and fy in psi.
    //        = max( 3*sqrt(4000)/60000 , 200/60000 ) * 12 * 21.5
    //        = max( 0.8159 , 0.8600 ) = 0.86 in^2
    const asMinRoot = ((3 * Math.sqrt(4000)) / 60000) * B * D;
    const asMinFloor = (200 / 60000) * B * D;
    expect(asMinRoot).toBeCloseTo(0.8159, 4);
    expect(asMinFloor).toBeCloseTo(0.86, 4);

    // A small moment must be governed by that minimum, not by the demand.
    const { AsRequired } = checkFlexure(100, C4000, BEAM_12x24);
    expect(AsRequired).toBeCloseTo(0.86, 4);
  });

  it('solves the textbook area for Mu = 200 kip-ft', () => {
    // Rn = Mu/(phi*b*d^2) = 2400/(0.9*12*21.5^2) = 0.4807 ksi
    // As = (0.85*f'c*b*d/fy)*(1 - sqrt(1 - 2Rn/(0.85 f'c))) = 2.239 in^2
    const { ratio, AsRequired } = checkFlexure(2400, C4000, BEAM_12x24);
    expect(AsRequired).toBeCloseTo(2.239, 3);

    // Independent back-check: with that As, phi*Mn must return the demand.
    const a = (AsRequired * FY) / (0.85 * 4 * B);
    expect(a).toBeCloseTo(3.292, 3);
    const phiMn = 0.9 * AsRequired * FY * (D - a / 2);
    expect(phiMn).toBeCloseTo(2400, 0);
    expect(ratio).toBeCloseTo(1.0, 6);
  });

  it('leaves headroom when the minimum steel governs', () => {
    // With As pinned at As,min = 0.86 in^2:
    //   a = 0.86*60/(0.85*4*12) = 1.265 in
    //   phi*Mn = 0.9*0.86*60*(21.5 - 0.632) = 969 kip-in
    const { ratio } = checkFlexure(100, C4000, BEAM_12x24);
    expect(ratio).toBeCloseTo(100 / 969.1, 3);
    expect(ratio).toBeLessThan(1);
  });

  it('required steel grows with moment', () => {
    const areas = [500, 1500, 2400, 3500].map(
      (Mu) => checkFlexure(Mu, C4000, BEAM_12x24).AsRequired,
    );
    for (let i = 1; i < areas.length; i++) {
      expect(areas[i]).toBeGreaterThan(areas[i - 1]);
    }
  });

  it('flags a section too small to develop the moment', () => {
    // Beyond the balanced point the quadratic has no real root.
    const { ratio, AsRequired } = checkFlexure(20000, C4000, BEAM_12x24);
    expect(AsRequired).toBe(999);
    expect(ratio).toBe(10);
  });

  it('is sign-independent and zero for no moment', () => {
    expect(checkFlexure(-2400, C4000, BEAM_12x24).AsRequired)
      .toBeCloseTo(checkFlexure(2400, C4000, BEAM_12x24).AsRequired, 12);
    expect(checkFlexure(0, C4000, BEAM_12x24)).toEqual({ ratio: 0, AsRequired: 0 });
  });
});

describe('ACI 318 — beam shear', () => {
  // Eq. 22.5.5.1: Vc = 2*lambda*sqrt(f'c)*bw*d with f'c in psi, result in lb.
  //   Vc = 2*sqrt(4000)*12*21.5 = 32,635 lb = 32.6 kips
  //   phi*Vc = 0.75 * 32.635 = 24.5 kips
  const VC = (2 * Math.sqrt(4000) * B * D) / 1000;
  const PHI_VC = 0.75 * VC;

  it('concrete capacity matches Eq. 22.5.5.1', () => {
    expect(VC).toBeCloseTo(32.635, 3);
    expect(PHI_VC).toBeCloseTo(24.476, 3);
  });

  it('reaches D/C = 1.0 at phi*Vc with no stirrups required', () => {
    const { ratio, AvRequired } = checkShear(PHI_VC, C4000, BEAM_12x24);
    expect(ratio).toBeCloseTo(1.0, 6);
    expect(AvRequired).toBe(0);
  });

  it('requires no stirrups below phi*Vc', () => {
    const { ratio, AvRequired } = checkShear(PHI_VC / 2, C4000, BEAM_12x24);
    expect(ratio).toBeCloseTo(0.5, 6);
    expect(AvRequired).toBe(0);
  });

  it('requires stirrups above phi*Vc', () => {
    const { AvRequired } = checkShear(PHI_VC * 1.5, C4000, BEAM_12x24);
    expect(AvRequired).toBeGreaterThan(0);
  });

  it('rejects a demand beyond the Vs limit of 22.5.1.2', () => {
    // Vs,max = 8*sqrt(f'c)*bw*d = 130.5 kips, so Vu/phi - Vc past that fails.
    const VsMax = (8 * Math.sqrt(4000) * B * D) / 1000;
    expect(VsMax).toBeCloseTo(130.54, 2);

    const beyond = 0.75 * (VC + VsMax) * 1.05;
    const { ratio, AvRequired } = checkShear(beyond, C4000, BEAM_12x24);
    expect(ratio).toBe(10);
    expect(AvRequired).toBe(999);
  });

  it('does not pass a demand an order of magnitude past capacity', () => {
    // Guards the ksi/psi slip that made phi*Vc read ~774 kips on this section.
    const { ratio } = checkShear(500, C4000, BEAM_12x24);
    expect(ratio).toBeGreaterThan(1);
  });

  it('is sign-independent and zero for no shear', () => {
    expect(checkShear(-20, C4000, BEAM_12x24).ratio)
      .toBeCloseTo(checkShear(20, C4000, BEAM_12x24).ratio, 12);
    expect(checkShear(0, C4000, BEAM_12x24)).toEqual({ ratio: 0, AvRequired: 0 });
  });
});

describe('ACI 318 — column P-M interaction', () => {
  /**
   * checkColumn is documented as a simplified linear interaction with an
   * assumed 1% reinforcement ratio, not a section-specific analysis, so these
   * assert the properties the caller relies on rather than tabulated capacity.
   */
  const COL_16x16: Section = {
    id: 'C16x16', name: '16x16', A: 256,
    Ix: 5461, Iy: 5461, J: 0, Sx: 683, Sy: 683, Zx: 1024, Zy: 1024,
    b: 16, h: 16,
  };

  it('returns zero with no demand', () => {
    expect(checkColumn(0, 0, C4000, COL_16x16)).toBe(0);
  });

  it('grows with axial load at constant moment', () => {
    const low = checkColumn(100, 200, C4000, COL_16x16);
    const high = checkColumn(400, 200, C4000, COL_16x16);
    expect(high).toBeGreaterThan(low);
  });

  it('grows with moment at constant axial load', () => {
    const low = checkColumn(300, 100, C4000, COL_16x16);
    const high = checkColumn(300, 600, C4000, COL_16x16);
    expect(high).toBeGreaterThan(low);
  });

  it('stays within the documented 0..10 range', () => {
    expect(checkColumn(50000, 50000, C4000, COL_16x16)).toBe(10);
    expect(checkColumn(1, 1, C4000, COL_16x16)).toBeGreaterThanOrEqual(0);
  });
});

describe('ACI 318 — element dispatch', () => {
  it('treats a low-axial element as a beam', () => {
    // Column threshold is P > 0.1*f'c*Ag = 0.1*4*288 = 115.2 kips.
    const r = designConcreteElement('E1', 10, 20, 1200, C4000, BEAM_12x24);
    expect(r.details.shearRatio).toBeGreaterThan(0);
    expect(r.details.AsRequired).toBeGreaterThan(0);
  });

  it('treats a high-axial element as a column', () => {
    const r = designConcreteElement('E2', 200, 20, 1200, C4000, BEAM_12x24);
    // The column branch reports no shear check and nominal 1% steel.
    expect(r.details.shearRatio).toBe(0);
    expect(r.details.AsRequired).toBeCloseTo(0.01 * 288, 6);
  });

  it('reports the governing ratio and a matching status', () => {
    const r = designConcreteElement('E3', 10, 20, 1200, C4000, BEAM_12x24);
    expect(r.ratio).toBe(Math.max(r.details.flexureRatio, r.details.shearRatio));
    expect(r.status).toBe(r.ratio <= 1.0 ? 'pass' : 'fail');
    expect(r.material).toBe('concrete');
    expect(r.elementId).toBe('E3');
  });
});
