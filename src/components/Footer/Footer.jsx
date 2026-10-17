import { useI18n } from '../../i18n/index';
import { Link } from 'react-router-dom';
import Brand from '../UI/Brand';
import { ArrowUpRight } from 'lucide-react';
export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div>
          <Brand />
          <p>
            {t('Идеи обретают движение.')}
            <br />
            {t('Творчество выходит на новую орбиту.')}
          </p>
        </div>
        <div className="footer-links">
          <a href="/#showcase">
            {t('Возможности')}
            <ArrowUpRight size={13} />
          </a>
          <a href="/#generator">
            {t('Генератор')}
            <ArrowUpRight size={13} />
          </a>
          <a href="/#pricing">
            {t('Тарифы')}
            <ArrowUpRight size={13} />
          </a>
          <Link to="/contact">
            {t('Контакты')}
            <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="footer-links">
          <Link to="/privacy">{t('Конфиденциальность')}</Link>
          <Link to="/terms">{t('Условия использования')}</Link>
        </div>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        BETELGEUSE
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Betelgeuse</span>
        <span>
          {t('FROM AN IDEA TO INFINITY ')}
          <span className="tiny-star">✦</span>
        </span>
      </div>
    </footer>
  );
}
