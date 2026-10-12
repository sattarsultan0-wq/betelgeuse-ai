import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import AuthDialog from './components/UI/AuthDialog';
import Home from './pages/Home';
const Library = lazy(() => import('./pages/Library'));
const Information = lazy(() => import('./pages/Information'));
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const timer = setTimeout(
        () =>
          document
            .getElementById(hash.slice(1))
            ?.scrollIntoView({
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
  return (
    <>
      <a className="skip-link" href="#main">
        К содержимому
      </a>
      <ScrollManager />
      <Header />
      <main id="main">
        <Suspense fallback={<div className="subpage container">Загрузка…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<Library />} />
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
      <Footer />
      <AuthDialog />
    </>
  );
}
