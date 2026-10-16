import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import useWorkflowGenerations from '../hooks/useWorkflowGenerations';
import ProfessionalWorkflow from '../components/Workspace/ProfessionalWorkflow';
import StandardWorkflow from '../components/Workspace/StandardWorkflow';
import WorkflowLoader from '../components/Workspace/WorkflowLoader';

export default function WorkflowPage() {
  const { billingLoading, setWorkflowReady, showWorkflowIntro } = useOutletContext();
  const { user, refresh } = useAuth();
  const generations = useWorkflowGenerations(user.id, refresh);
  const { items, loading } = generations;
  const [models, setModels] = useState([]),
    [modelError, setModelError] = useState('');
  const [modelsLoading, setModelsLoading] = useState(true),
    [minimumElapsed, setMinimumElapsed] = useState(!showWorkflowIntro),
    [loaderStage, setLoaderStage] = useState(showWorkflowIntro ? 'loading' : 'done');
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('betelgeuse:workflow-mode:' + user.id) === 'pro'
        ? 'pro'
        : 'standard';
    } catch {
      return 'standard';
    }
  });
  const [professionalReady, setProfessionalReady] = useState(mode === 'pro');
  useEffect(() => {
    if (mode !== 'pro' || professionalReady) return;
    const timer = setTimeout(() => setProfessionalReady(true), 2000);
    return () => clearTimeout(timer);
  }, [mode, professionalReady]);
  function changeMode(next) {
    if (next === mode) return;
    if (next === 'pro') setProfessionalReady(false);
    setMode(next);
  }
  useEffect(() => {
    try {
      localStorage.setItem('betelgeuse:workflow-mode:' + user.id, mode);
    } catch {
      /* Optional preference. */
    }
  }, [mode, user.id]);
  useEffect(() => {
    const controller = new AbortController();
    api('/models', { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data.models))
          throw new Error('Сервер вернул некорректный каталог моделей.');
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
    if (!showWorkflowIntro) return;
    const timer = setTimeout(() => setMinimumElapsed(true), 2000);
    return () => clearTimeout(timer);
  }, [showWorkflowIntro]);
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
          <div className="wf-heading-actions">
            {mode === 'pro' && (
              <span className="wf-active-count">
                <Sparkles size={13} />
                {
                  items.filter((item) =>
                    ['queued', 'processing', 'uploading'].includes(item.status),
                  ).length
                }{' '}
                активных
              </span>
            )}
            <div className="wf-mode-switch" role="group" aria-label="Интерфейс Workflow">
              <button
                type="button"
                aria-pressed={mode === 'standard'}
                onClick={() => changeMode('standard')}
              >
                Standard
              </button>
              <button type="button" aria-pressed={mode === 'pro'} onClick={() => changeMode('pro')}>
                Pro
              </button>
            </div>
          </div>
        </header>
        <div className="wf-mode-panel" hidden={mode !== 'standard'}>
          <StandardWorkflow
            key={user.id}
            user={user}
            refresh={refresh}
            models={models}
            modelError={modelError}
            modelsLoading={modelsLoading}
          />
        </div>
        <div className="wf-mode-panel wf-pro-panel" hidden={mode !== 'pro'}>
          {mode === 'pro' && !professionalReady && (
            <div className="wf-pro-loader" role="status" aria-label="Загрузка Professional">
              <div className="wf-loader-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className="sr-only">Загрузка Professional…</span>
            </div>
          )}
          <div
            className={`wf-pro-content ${professionalReady ? 'is-ready' : ''}`}
            inert={mode !== 'pro' || !professionalReady}
            aria-hidden={mode !== 'pro' || !professionalReady}
          >
            <ProfessionalWorkflow
              key={user.id}
              user={user}
              models={models}
              modelsLoading={modelsLoading}
              modelError={modelError}
              active={mode === 'pro' && professionalReady}
              {...generations}
            />
          </div>
        </div>
      </section>
    </>
  );
}
