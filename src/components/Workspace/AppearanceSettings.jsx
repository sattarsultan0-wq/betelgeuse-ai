import { Moon, Sun } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useTheme } from '../../hooks/useTheme';
import LanguageMenu from '../UI/LanguageMenu';

export default function AppearanceSettings() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  return (
    <section className="appearance-settings" aria-labelledby="appearance-title">
      <h3 id="appearance-title">{t('Внешний вид')}</h3>
      <div
        className="appearance-theme-options"
        role="group"
        aria-label={t('Тема рабочего пространства')}
      >
        {[
          ['dark', 'Тёмная', Moon],
          ['light', 'Светлая', Sun],
        ].map(([value, label, Icon]) => (
          <button
            type="button"
            key={value}
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
          >
            <span className={`appearance-preview appearance-preview-${value}`} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              <Icon size={16} />
              {t(label)}
            </span>
          </button>
        ))}
      </div>
      <div className="appearance-language">
        <span>{t('Язык')}</span>
        <LanguageMenu />
      </div>
      <p className="muted">{t('Настройки сохраняются автоматически.')}</p>
    </section>
  );
}
