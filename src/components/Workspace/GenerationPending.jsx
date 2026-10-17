import { useI18n } from '../../i18n/index';
import './generation-pending.css';

export const isGenerationActive = (status) =>
  ['uploading', 'queued', 'processing'].includes(status);

export function FrameTracing() {
  return (
    <svg className="wf-frame-tracing" aria-hidden="true" focusable="false">
      <rect
        className="wf-frame-tracing-segment"
        x="0.5"
        y="0.5"
        rx="13.5"
        pathLength="100"
        fill="none"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="8 92"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function GenerationPending() {
  const { t } = useI18n();
  return (
    <div className="wf-generation-pending" role="status" aria-live="polite">
      <div className="wf-neural-pulse" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} style={{ '--wf-pulse-delay': `${index * -0.14}s` }} />
        ))}
      </div>
      <span className="wf-generating-label">{t('Generating')}</span>
    </div>
  );
}
