export function priceLabel(price, t) {
  if (price?.status !== 'AVAILABLE' || !Number.isSafeInteger(price.credits) || price.credits <= 0)
    return t('Цена не указана');
  return price.kind === 'from'
    ? t('от {{v0}} кр.', { v0: price.credits })
    : t('{{v0}} кр.', { v0: price.credits });
}

export function generationPriceLabel(item, t) {
  const label = priceLabel(item.pricing, t);
  if (
    item.pricing?.status !== 'AVAILABLE' &&
    Number.isInteger(item.chargedCredits) &&
    item.chargedCredits > 0
  )
    return t('Списано {{v0}} кр.', { v0: item.chargedCredits });
  if (item.pricing?.status === 'AVAILABLE' && item.adminTest && item.chargedCredits === 0)
    return t('{{v0}} · списание 0', { v0: label });
  return label;
}
