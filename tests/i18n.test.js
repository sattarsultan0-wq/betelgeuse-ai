import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createInstance } from 'i18next';
import { createTranslator } from '../src/i18n/translation.js';
import { readPreference, savePreference } from '../src/i18n/preferences.js';

const dictionaries = Object.fromEntries(
  ['ru', 'en', 'kk'].map((language) => [
    language,
    JSON.parse(
      fs.readFileSync(new URL(`../src/i18n/locales/${language}.json`, import.meta.url), 'utf8'),
    ),
  ]),
);
const instance = createInstance();
await instance.init({
  resources: Object.fromEntries(
    Object.entries(dictionaries).map(([code, translation]) => [code, { translation }]),
  ),
  lng: 'ru',
  fallbackLng: 'ru',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});
const t = createTranslator(instance, dictionaries.ru);

test('all languages cover the same UI and API messages, with matching interpolation parameters', () => {
  const keys = Object.keys(dictionaries.ru).sort();
  for (const language of ['en', 'kk']) {
    assert.deepEqual(Object.keys(dictionaries[language]).sort(), keys);
    for (const key of keys) {
      assert.ok(dictionaries[language][key].trim(), `${language}: ${key}`);
      const placeholders = (value) =>
        [...value.matchAll(/{{(\w+)}}/g)].map((match) => match[1]).sort();
      assert.deepEqual(
        placeholders(dictionaries[language][key]),
        placeholders(key),
        `${language}: ${key}`,
      );
    }
  }
});
test('changing languages translates controls and stored API errors without changing stored values', async () => {
  const message = 'Неверный email или пароль';
  for (const [language, expected] of [
    ['ru', message],
    ['en', 'Incorrect email or password'],
    ['kk', 'Email немесе құпиясөз қате'],
  ]) {
    await instance.changeLanguage(language);
    assert.equal(t(message), expected);
    assert.equal(message, 'Неверный email или пароль');
  }
});
test('dynamic server messages translate quantities and preserve punctuation', async () => {
  await instance.changeLanguage('en');
  assert.equal(t('Можно добавить не более 3 файлов.'), 'You can add up to 3 files.');
  assert.equal(t('Ошибка Higgsfield (429)'), 'Higgsfield error (429)');
  assert.equal(t('Доступно 20 кредитов'), '20 credits available');
  assert.equal(t('Действует до {{v0}}', { v0: '10/17/2026' }), 'Valid until 10/17/2026');
});
test('unknown content, model names, React values and interpolation values are preserved', async () => {
  await instance.changeLanguage('en');
  const content = { props: { children: 'Главная' } };
  assert.equal(t(content), content);
  assert.equal(t(20), 20);
  assert.equal(t(null), null);
  assert.equal(t('Kling 3.0 Standard'), 'Kling 3.0 Standard');
  assert.equal(t('An unknown provider error'), 'An unknown provider error');
  assert.equal(
    t('Открыть материал: {{v0}}', { v0: 'Главная <script>' }),
    'Open media: Главная <script>',
  );
});
test('catalog labels inside API errors translate while user content stays verbatim', async () => {
  await instance.changeLanguage('en');
  assert.equal(t('Добавьте референс: Первый кадр.'), 'Add a reference: First frame.');
  assert.equal(t('Референс «Изображение»: от 1 до 3'), 'Reference “Image”: 1 to 3');
  assert.equal(t('Открыть материал: Главная'), 'Open media: Главная');
});
test('Kazakh translations retain Kazakh letters and are valid UTF-8', () => {
  const text = Object.values(dictionaries.kk).join(' ');
  for (const letter of ['ә', 'ғ', 'қ', 'ң', 'ө', 'ұ', 'ү', 'і'])
    assert.ok(text.toLowerCase().includes(letter), letter);
  assert.ok(!text.includes('\uFFFD'));
});
test('invalid or inaccessible saved preferences use defaults, and unavailable storage does not throw', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => 'invalid',
        setItem: () => {
          throw Error('denied');
        },
      },
    });
    assert.equal(readPreference('theme', ['dark', 'light'], 'dark'), 'dark');
    assert.doesNotThrow(() => savePreference('theme', 'light'));
    globalThis.localStorage.getItem = () => {
      throw Error('denied');
    };
    assert.equal(readPreference('language', ['ru', 'en', 'kk'], 'ru'), 'ru');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});
