import { Link } from 'react-router-dom';
import Brand from '../UI/Brand';
import { ArrowUpRight } from 'lucide-react';
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div>
          <Brand />
          <p>
            Идеи обретают движение.
            <br />
            Творчество выходит на новую орбиту.
          </p>
        </div>
        <div className="footer-links">
          <a href="/#showcase">
            Возможности
            <ArrowUpRight size={13} />
          </a>
          <a href="/#generator">
            Генератор
            <ArrowUpRight size={13} />
          </a>
          <a href="/#pricing">
            Тарифы
            <ArrowUpRight size={13} />
          </a>
          <Link to="/contact">
            Контакты
            <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="footer-links">
          <Link to="/privacy">Конфиденциальность</Link>
          <Link to="/terms">Условия использования</Link>
        </div>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        BETELGEUSE
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Betelgeuse</span>
        <span>
          FROM AN IDEA TO INFINITY <span className="tiny-star">✦</span>
        </span>
      </div>
    </footer>
  );
}
