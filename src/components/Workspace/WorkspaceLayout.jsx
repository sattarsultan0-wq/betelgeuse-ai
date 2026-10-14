import { Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LoaderCircle, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import Sidebar from './Sidebar';
import { Star } from '../UI/Brand';
import '../../styles/workflow.css';

export default function WorkspaceLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [compact, setCompact] = useState(() => {
    try {
      return localStorage.getItem('betelgeuse:sidebar-compact') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false),
    [billing, setBilling] = useState(null),
    [billingError, setBillingError] = useState('');
  const [showWorkflowIntro, setShowWorkflowIntro] = useState(
    () => pathname.replace(/\/$/, '') === '/workflow',
  );
  const [billingLoading, setBillingLoading] = useState(true),
    [workflowReady, updateWorkflowReady] = useState(
      () => pathname.replace(/\/$/, '') !== '/workflow',
    );
  const setWorkflowReady = useCallback((ready) => {
    updateWorkflowReady(ready);
    if (ready) setShowWorkflowIntro(false);
  }, []);
  useLayoutEffect(() => {
    if (pathname.replace(/\/$/, '') !== '/workflow') setWorkflowReady(true);
  }, [pathname]);
  useEffect(() => {
    const controller = new AbortController();
    setBillingLoading(true);
    api('/users/me/billing', { signal: controller.signal })
      .then((data) => {
        setBilling(data);
        setBillingError('');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setBillingError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBillingLoading(false);
      });
    return () => controller.abort();
  }, [user.id, user.generationCredits]);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [mobileOpen]);
  function toggleCompact() {
    setCompact((value) => {
      try {
        localStorage.setItem('betelgeuse:sidebar-compact', String(!value));
      } catch {
        /* Optional preference. */
      }
      return !value;
    });
  }
  return (
    <div
      className={`wf-shell ${compact ? 'wf-shell-compact' : ''} ${pathname.replace(/\/$/, '') === '/workflow' ? (workflowReady ? 'wf-shell-ready' : 'wf-route-loading') : ''}`}
    >
      <Sidebar
        compact={compact}
        onCompact={toggleCompact}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        billing={billing}
        billingError={billingError}
      />
      <div className="wf-main">
        <div className="wf-mobile-bar">
          <button
            className="icon-button"
            aria-label="Открыть навигацию"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu size={19} />
          </button>
          <span className="wf-mobile-brand"><Star /> BETELGEUSE</span>
          <small>{user.generationCredits ?? 0} кр.</small>
        </div>
        <Suspense
          fallback={
            <div className="wf-page-loading">
              <LoaderCircle className="spin" />
              <p>Загрузка раздела…</p>
            </div>
          }
        >
          <Outlet
            context={{ billing, billingError, billingLoading, setWorkflowReady, showWorkflowIntro }}
          />
        </Suspense>
      </div>
    </div>
  );
}
