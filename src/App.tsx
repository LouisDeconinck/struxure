import { useEffect } from 'react';
import { Toolbar } from './components/layout/Toolbar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { ResultsBar } from './components/layout/ResultsBar';
import { AnalysisErrorBanner } from './components/shared/AnalysisErrorBanner';
import { Viewport3D } from './components/viewport/Viewport3D';
import { DxfDropZone } from './components/shared/DxfDropZone';
import { MobileGate } from './components/shared/MobileGate';
import { AiSidebar } from './components/chat/AiSidebar';
import { useModelStore } from './store/model-store';
import { TEMPLATES, getTemplateFromURL } from './utils/templates';
import { runAnalysis } from './utils/run-analysis';

function App() {
  const loadModel = useModelStore((s) => s.loadModel);

  useEffect(() => {
    const urlTpl = getTemplateFromURL();
    const tpl = urlTpl || TEMPLATES.find((t) => t.id === '3d-building');
    if (!tpl) return;

    loadModel(tpl.load());
    setTimeout(() => window.dispatchEvent(new Event('zoom-extents')), 100);

    // Auto-analyze when loaded via URL param, once the canvas has rendered.
    if (urlTpl) {
      setTimeout(() => { void runAnalysis(useModelStore.getState().getModel()); }, 300);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <MobileGate>
      <DxfDropZone>
        <div className="flex flex-col h-screen w-screen bg-surface-0 font-sans text-slate-100 overflow-hidden">
          <Toolbar />
          <AnalysisErrorBanner />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col bg-canvas relative overflow-hidden">
              <div className="flex-1 min-h-0 relative">
                <Viewport3D />
              </div>
              <ResultsBar />
            </main>
            <AiSidebar />
          </div>
          <StatusBar />
        </div>
      </DxfDropZone>
    </MobileGate>
  );
}

export default App;
