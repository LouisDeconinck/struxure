import type { StructuralModel, AnalysisResults } from '../core/types';
import { SolverManager } from '../core/solver-manager';
import { solveModel } from '../core/solver';
import { runDesign } from '../design/design-runner';
import { useResultsStore } from '../store/results-store';

/**
 * Runs the analysis and the design checks for a model, and writes both into the
 * results store.
 *
 * This is the single place that knows the sequence — solve in the worker, fall
 * back to the main thread, then run design checks — which was previously copied
 * into five call sites across the desktop toolbar, the mobile viewer and app
 * startup, each with slightly different error handling.
 *
 * Design checks are optional: a model that analyses but has no checkable
 * material still yields displacements and forces.
 *
 * @param onManager receives the live SolverManager so a caller can cancel an
 * in-flight solve, and null once the run is over.
 * @returns whether results were produced.
 */
export async function runAnalysis(
  model: StructuralModel,
  onManager?: (manager: SolverManager | null) => void,
): Promise<boolean> {
  const {
    setAnalysisResults, setDesignResults, setAnalysisError, setSolving, setSolverProgress,
  } = useResultsStore.getState();

  const applyResults = (results: AnalysisResults) => {
    setAnalysisResults(results);
    try {
      setDesignResults(runDesign(model, results));
    } catch {
      // Design checks are optional; analysis results still stand without them.
    }
  };

  setSolving(true);
  const manager = new SolverManager();
  manager.onProgress = setSolverProgress;
  onManager?.(manager);

  try {
    applyResults(await manager.solve(model));
    return true;
  } catch {
    // The worker may be unavailable rather than the model unsolvable, so retry
    // on the main thread before reporting failure. Same maths, blocking UI.
    try {
      applyResults(solveModel(model));
      return true;
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
      return false;
    }
  } finally {
    onManager?.(null);
    setSolving(false);
  }
}
