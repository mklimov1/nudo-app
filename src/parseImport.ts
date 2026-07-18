import type { PairInput } from './db';

/**
 * Разбирает JSON-текст в список пар для импорта. Поддерживает форматы:
 *
 * 1. Массив объектов:
 *    [{ "value": "apple", "translation": "яблоко",
 *       "description": "фрукт", "translationDescription": "..." }]
 *    (синонимы ключей: word/term для value, meaning для translation,
 *     comment для description)
 *
 * 2. Массив пар-кортежей: [["apple", "яблоко"], ...]
 *
 * 3. Простой словарь: { "apple": "яблоко", "book": "книга" }
 *
 * Бросает Error с понятным сообщением, если формат не распознан.
 */
export function parseImport(text: string): PairInput[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Не удалось разобрать JSON — проверьте синтаксис файла');
  }

  // Формат 3: объект-словарь.
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    const pairs = entries
      .filter(([, v]) => typeof v === 'string')
      .map(([value, translation]) => ({ value, translation: translation as string }));
    if (pairs.length === 0) {
      throw new Error('В объекте не найдено пар «слово: перевод»');
    }
    return pairs;
  }

  if (!Array.isArray(data)) {
    throw new Error('Ожидается массив пар или объект «слово: перевод»');
  }

  const pairs: PairInput[] = [];
  for (const item of data) {
    // Формат 2: кортеж [слово, перевод].
    if (Array.isArray(item)) {
      const [value, translation] = item;
      if (typeof value === 'string' && typeof translation === 'string') {
        pairs.push({ value, translation });
      }
      continue;
    }
    // Формат 1: объект.
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const value = pick(o, 'value', 'word', 'term');
      const translation = pick(o, 'translation', 'meaning', 'target');
      if (value && translation) {
        pairs.push({
          value,
          translation,
          valueDescription: pick(o, 'description', 'comment'),
          translationDescription: pick(o, 'translationDescription', 'translationComment'),
        });
      }
    }
  }

  if (pairs.length === 0) {
    throw new Error('Не найдено ни одной пары «слово + перевод»');
  }
  return pairs;
}

function pick(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}
