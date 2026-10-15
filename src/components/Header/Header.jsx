import { useEffect, useRef, useState } from 'react';
import { Menu, X, ArrowUpRight, LogOut, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import Brand from '../UI/Brand';
import { useAuth } from '../../context/AuthContext';
import HeaderGlass from './HeaderGlass';
import './Header.css';
const links = [
  ['Главная', 'home'],
  ['Тренды', 'showcase'],
  ['Создавать', 'generator'],
  ['Тарифы', 'pricing'],
];
export default function Header() {
  const [scrolled, setScrolled] = useState(false),
    [open, setOpen] = useState(false),
    [error, setError] = useState('');
  const { user, setDialog, logout } = useAuth();
  const header = useRef(null),
    pointerFrame = useRef(null),
    bounds = useRef(null);
  useEffect(() => () => cancelAnimationFrame(pointerFrame.current), []);
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 30);
      if (
        window.matchMedia('(hover: none)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        header.current?.style.setProperty(
          '--glass-pointer-x',
          `${48 + Math.sin(window.scrollY * 0.006) * 18}%`,
        );
        header.current?.style.setProperty('--glass-pointer-y', '15%');
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  function moveReflection(event) {
    if (
      event.pointerType === 'touch' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const rect = bounds.current || event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left,
      y = event.clientY - rect.top;
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = requestAnimationFrame(() => {
      header.current?.style.setProperty('--glass-pointer-x', `${x}px`);
      header.current?.style.setProperty('--glass-pointer-y', `${y}px`);
    });
  }
  return (
    <header
      className={`header ${scrolled ? 'header-scrolled' : ''} ${open ? 'header-menu-open' : ''}`}
      ref={header}
      onPointerEnter={(event) => {
        bounds.current = event.currentTarget.getBoundingClientRect();
      }}
      onPointerMove={moveReflection}
      onPointerLeave={() => {
        cancelAnimationFrame(pointerFrame.current);
        bounds.current = null;
      }}
    >
      <HeaderGlass />
      <div className="header-content">
        <Brand />
        <nav className={open ? 'nav open' : 'nav'} aria-label="Основная навигация">
          {links.map(([label, id]) => (
            <a key={id} href={`/#${id}`} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              {user.isAdmin && (
                <Link className="icon-button" to="/admin" aria-label="Админка" title="Админка">
                  <Shield size={18} />
                </Link>
              )}
              <Link className="account-link" to="/library">
                {user.name.split(' ')[0]}
              </Link>
              <button
                className="icon-button"
                aria-label="Выйти"
                onClick={() => logout().catch((err) => setError(err.message))}
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <>
              <button className="text-button login-button" onClick={() => setDialog('login')}>
                Войти
              </button>
              <button className="glass-button compact" onClick={() => setDialog('register')}>
                Регистрация
                <ArrowUpRight size={16} />
              </button>
            </>
          )}
          <button
            className="icon-button menu-button"
            aria-expanded={open}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {error && (
        <p className="header-error error" role="alert">
          {error}
        </p>
      )}
    </header>
  );
}
