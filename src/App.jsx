import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import AuthDialog from './components/UI/AuthDialog';
import Home from './pages/Home';
import WorkflowLoader from './components/Workspace/WorkflowLoader';
const Library = lazy(() => import('./pages/Library'));
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'));
const Billing = lazy(() => import('./pages/Billing'));
const TrendsPage = lazy(() => import('./pages/TrendsPage'));
const WorkspaceLayout = lazy(() => import('./components/Workspace/WorkspaceLayout'));
const ProtectedWorkspace = lazy(() => import('./components/Workspace/ProtectedWorkspace'));
const Admin = lazy(() => import('./pages/Admin'));
const Information = lazy(() => import('./pages/Information'));
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const timer = setTimeout(
        () =>
          document.getElementById(hash.slice(1))?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
          }),
        80,
      );
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
export default function App() {
  const { pathname } = useLocation();
  const workspace = ['/workflow', '/trends', '/library', '/billing'].includes(pathname.replace(/\/$/, ''));
  return (
    <>
      <a className="skip-link" href="#main">
        К содержимому
      </a>
      <ScrollManager />
      {!workspace && <Header />}
      <main id="main">
        <Suspense
          fallback={
            pathname.replace(/\/$/, '') === '/workflow' ? (
              <WorkflowLoader />
            ) : (
              <div className="subpage container">Загрузка…</div>
            )
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route element={<ProtectedWorkspace />}>
              <Route element={<WorkspaceLayout />}>
                <Route path="/workflow" element={<WorkflowPage />} />
                <Route path="/trends" element={<TrendsPage />} />
                <Route path="/library" element={<Library />} />
                <Route path="/billing" element={<Billing />} />
              </Route>
            </Route>
            <Route path="/admin" element={<Admin />} />
            {['privacy', 'terms', 'contact'].map((kind) => (
              <Route path={`/${kind}`} key={kind} element={<Information kind={kind} />} />
            ))}
            <Route
              path="*"
              element={
                <section className="subpage container">
                  <h1>Эта орбита пока пуста</h1>
                  <Link className="glass-button" to="/">
                    На главную
                  </Link>
                </section>
              }
            />
          </Routes>
        </Suspense>
      </main>
      {!workspace && <Footer />}
      <AuthDialog />
    </>
  );
}
