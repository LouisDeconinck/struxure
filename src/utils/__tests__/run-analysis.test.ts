import { describe, it, expect, beforeEach } from 'vitest';
import { runAnalysis } from '../run-analysis';
import { SolverManager } from '../../core/solver-manager';
import { useResultsStore } from '../../store/results-store';
import { TEMPLATES } from '../templates';
import type { StructuralModel } from '../../core/types';

const simpleBeam = (): StructuralModel =>
  TEMPLATES.find((t) => t.id === 'simple-beam')!.load();

describe('runAnalysis', () => {
  beforeEach(() => {
    useResultsStore.getState().clearResults();
  });

  it('fills the results store from a solvable model', async () => {
    const ok = await runAnalysis(simpleBeam());

    expect(ok).toBe(true);
    const s = useResultsStore.getState();
    expect(s.isAnalyzed).toBe(true);
    expect(s.analysisResults).not.toBeNull();
    expect(s.analysisError).toBeNull();
  });

  it('runs the design checks alongside the analysis', async () => {
    await runAnalysis(simpleBeam());

    const s = useResultsStore.getState();
    expect(s.isDesigned).toBe(true);
    expect(s.designResults.length).toBeGreaterThan(0);
  });

  it('clears the solving flag when it finishes', async () => {
    await runAnalysis(simpleBeam());
    expect(useResultsStore.getState().isSolving).toBe(false);
  });

  it('falls back to the main thread when the worker is unavailable', async () => {
    // There is no Worker in this environment, so reaching results at all proves
    // the synchronous fallback ran rather than the run failing with the worker.
    const ok = await runAnalysis(simpleBeam());
    expect(ok).toBe(true);
    expect(useResultsStore.getState().analysisResults).not.toBeNull();
  });

  it('reports an error instead of throwing when the model cannot be solved', async () => {
    const unsupported = simpleBeam();
    unsupported.supports = []; // Rigid-body motion: the stiffness matrix is singular.

    const ok = await runAnalysis(unsupported);

    expect(ok).toBe(false);
    const s = useResultsStore.getState();
    expect(s.isAnalyzed).toBe(false);
    expect(s.analysisError).toBeTruthy();
    expect(s.isSolving).toBe(false);
  });

  it('hands out a manager to cancel with, then takes it back', async () => {
    const seen: (SolverManager | null)[] = [];
    await runAnalysis(simpleBeam(), (m) => seen.push(m));

    expect(seen[0]).toBeInstanceOf(SolverManager);
    expect(seen.at(-1)).toBeNull();
  });

  it('releases the manager even when the analysis fails', async () => {
    const unsupported = simpleBeam();
    unsupported.supports = [];

    const seen: (SolverManager | null)[] = [];
    await runAnalysis(unsupported, (m) => seen.push(m));

    expect(seen.at(-1)).toBeNull();
  });
});
