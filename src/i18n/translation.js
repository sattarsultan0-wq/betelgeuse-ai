// Some catalog labels and API errors come from the server in Russian. Keep them
// unchanged in state and translate at render time using the same dictionaries.
export function createTranslator(i18n, dictionary) {
  // These placeholders contain catalog labels or another error, never user prompts.
  const localizedArguments = new Set([
    'Добавьте референс: {{v0}}.',
    'Референс «{{v0}}»: от {{v1}} до {{v2}}',
    'Не удалось загрузить модели. {{v0}}',
    '{{v0}}. Ответ на отправку не подтверждён. Требуется сверка с Higgsfield; автоматический повтор отключён.',
  ]);
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = Object.keys(dictionary)
    .filter((key) => key.includes('{{'))
    .sort((a, b) => b.replace(/{{.*?}}/g, '').length - a.replace(/{{.*?}}/g, '').length)
    .map((key) => ({
      key,
      names: [...key.matchAll(/{{(\w+)}}/g)].map((match) => match[1]),
      regex: new RegExp(
        '^' +
          key
            .split(/{{\w+}}/)
            .map(escapeRegex)
            .join('([\\s\\S]+?)') +
          '$',
      ),
    }));
  return function translate(value, options) {
    if (typeof value !== 'string' || !value.trim()) return value;
    const key = value.trim();
    if (Object.hasOwn(dictionary, key)) return value.replace(key, () => i18n.t(key, options));
    for (const pattern of patterns) {
      const match = pattern.regex.exec(key);
      if (match)
        return value.replace(key, () =>
          i18n.t(pattern.key, {
            ...Object.fromEntries(
              pattern.names.map((name, index) => [
                name,
                index === 0 && localizedArguments.has(pattern.key)
                  ? translate(match[index + 1])
                  : match[index + 1],
              ]),
            ),
            ...options,
          }),
        );
    }
    return value;
  };
}
