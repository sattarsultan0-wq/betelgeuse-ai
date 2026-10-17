import { useI18n } from '../../i18n/index';
export function Star({ className = '' }) {
  return <img src="/images/logo.png" alt="" className={`star ${className}`.trim()} />;
}
export default function Brand() {
  const { t } = useI18n();
  return (
    <a href="/#home" className="brand" aria-label={t('Betelgeuse — главная')}>
      <Star />
      <span>
        BETELGEUSE<span className="brand-dot">®</span>
      </span>
    </a>
  );
}
