import { useI18n } from '../../i18n/index';
import { priceLabel } from '../../services/pricing';
import './generation-price.css';

export default function GenerationPrice({ quote }) {
  const { t } = useI18n();
  const discounted = quote?.status === 'AVAILABLE' && quote.discountPercent > 0;
  return (
    <span className="generation-price" aria-live="polite">
      {discounted && <del>{priceLabel({ ...quote, credits: quote.baseCredits }, t)}</del>}
      <span>{priceLabel(quote, t)}</span>
      {discounted && (
        <span className="generation-price-discount">
          {t('Скидка {{percent}}%', { percent: quote.discountPercent })}
        </span>
      )}
    </span>
  );
}
