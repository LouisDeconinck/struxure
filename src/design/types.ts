export interface DesignCheckResult {
  elementId: string;
  material: 'steel' | 'concrete';
  ratio: number;
  status: 'pass' | 'fail';
  details: Record<string, number>;
}

export interface SteelDesignResult extends DesignCheckResult {
  material: 'steel';
  details: {
    tensionRatio: number;
    compressionRatio: number;
    flexureRatio: number;
    combinedRatio: number;
    governingCheck: number;
    phiPn: number;         // kips — design axial strength behind the governing axial ratio
    phiMn: number;         // kip-in — design flexural strength
  };
}

export interface ConcreteDesignResult extends DesignCheckResult {
  material: 'concrete';
  details: {
    flexureRatio: number;
    shearRatio: number;
    AsRequired: number;    // cm² of required steel
    AvRequired: number;    // cm²/m of required stirrups
    phiPn: number;         // kips — column axial strength (0 when checked as a beam)
    phiMn: number;         // kip-in — beam flexural strength (0 when checked as a column)
    phiVn: number;         // kips — beam shear strength (0 when checked as a column)
  };
}
