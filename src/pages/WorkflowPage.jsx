import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import useWorkflowGenerations from '../hooks/useWorkflowGenerations';
import InteractiveCanvas from '../components/Workspace/InteractiveCanvas';
import PromptComposer from '../components/Workspace/PromptComposer';
import MaterialDialog from '../components/Workspace/MaterialDialog';
import WorkflowLoader from '../components/Workspace/WorkflowLoader';

function readBoard(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(`betelgeuse:board:${userId}`));
    const positions = Object.fromEntries(
      Object.entries(value?.positions || {})
        .filter(([, point]) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
        .slice(-200),
    );
    return {
      positions,
      connections:
        value?.connections && typeof value.connections === 'object' ? value.connections : {},
    };
  } catch {
    return { positions: {}, connections: {} };
  }
}

export default function WorkflowPage() {
  const { billingLoading, setWorkflowReady } = useOutletContext();
  const { user, refresh } = useAuth();
  const { items, loading, error, submitting, pendingRequest, submit, retry } =
    useWorkflowGenerations(user.id, refresh);
  const [models, setModels] = useState([]),
    [modelError, setModelError] = useState(''),
    [prompt, setPrompt] = useState(''),
    [source, setSource] = useState(null),
    [material, setMaterial] = useState(null);
  const [board, setBoard] = useState(() => readBoard(user.id));
  const [modelsLoading, setModelsLoading] = useState(true),
    [minimumElapsed, setMinimumElapsed] = useState(false),
    [loaderStage, setLoaderStage] = useState('loading');
  const previousIds = useRef(new Set());
  useEffect(() => {
    const controller = new AbortController();
    api('/models', { signal: controller.signal })
      .then((data) => {
        setModels(data.models);
        setModelError('');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setModelError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setModelsLoading(false);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  const initialReady = !loading && !modelsLoading && !billingLoading;
  useEffect(() => {
    if (loaderStage === 'loading' && minimumElapsed && initialReady) setLoaderStage('exiting');
  }, [minimumElapsed, initialReady, loaderStage]);
  useEffect(() => {
    if (loaderStage !== 'exiting') return;
    const timer = setTimeout(() => {
      setLoaderStage('done');
      setWorkflowReady(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [loaderStage, setWorkflowReady]);
  useEffect(() => {
    const changed = items.filter(
      (item) => !previousIds.current.has(item.id) && (item.parentId || item.replacesId),
    );
    if (changed.length)
      setBoard((current) => {
        const positions = { ...current.positions },
          connections = { ...current.connections };
        for (const item of changed) {
          if (item.replacesId && positions[item.replacesId]) {
            positions[item.id] = positions[item.replacesId];
            delete positions[item.replacesId];
          }
          if (item.parentId) connections[item.id] = item.parentId;
          if (item.replacesId) delete connections[item.replacesId];
        }
        return { positions, connections };
      });
    previousIds.current = new Set(items.map((item) => item.id));
  }, [items]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`betelgeuse:board:${user.id}`, JSON.stringify(board));
      } catch {
        /* Optional layout persistence. */
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [board, user.id]);
  function derive(item) {
    setSource(item);
    setPrompt(item.prompt || '');
    document.getElementById('wf-prompt')?.focus();
  }
  return (
    <>
      {loaderStage !== 'done' && <WorkflowLoader exiting={loaderStage === 'exiting'} />}
      <section className="wf-workspace">
        <header className="wf-workspace-heading">
          <div>
            <span className="wf-workspace-symbol">✦</span>
            <h1>Workflow</h1>
            <span className="wf-workspace-badge">ТВОЯ ТВОРЧЕСКАЯ ОРБИТА</span>
          </div>
          <span>
            <Sparkles size={13} />
            {
              items.filter((item) => ['queued', 'processing', 'uploading'].includes(item.status))
                .length
            }{' '}
            активных
          </span>
        </header>
        <div className="wf-board-area">
          <InteractiveCanvas
            items={items}
            loading={loading}
            error={error}
            positions={board.positions}
            connections={board.connections}
            onMove={(id, position) =>
              setBoard((current) => ({
                ...current,
                positions: { ...current.positions, [id]: position },
              }))
            }
            onDerive={derive}
            onOpen={(item) => setMaterial(item)}
          />
          <div className="wf-composer-dock">
            <PromptComposer
              user={user}
              apiModels={models}
              modelError={modelError}
              prompt={prompt}
              setPrompt={setPrompt}
              source={source}
              onClearSource={() => setSource(null)}
              onSubmit={submit}
              submitting={submitting}
              pendingRequest={pendingRequest}
              onRetry={retry}
              loading={loading}
            />
          </div>
        </div>
        <MaterialDialog
          key={material?.id || 'closed'}
          item={material}
          onClose={() => setMaterial(null)}
        />
      </section>
    </>
  );
}
