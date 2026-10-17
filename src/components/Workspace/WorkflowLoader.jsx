import { useI18n } from '../../i18n/index';
import './workflow-loader.css';

export default function WorkflowLoader({ exiting = false }) {
  const { t } = useI18n();
  return (
    <div
      className={`wf-loader ${exiting ? 'wf-loader-exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={t('Загрузка рабочего пространства Betelgeuse')}
    >
      <div className="wf-loader-content">
        <span className="wf-loader-wordmark">BETELGEUSE</span>
        <div className="wf-loader-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="sr-only">{t('Загрузка рабочего пространства…')}</span>
      </div>
    </div>
  );
}
