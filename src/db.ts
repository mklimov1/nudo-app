import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { IDictionary, IWord, WordPair } from './types';

interface WordsDB extends DBSchema {
  words: {
    key: string;
    value: IWord;
    indexes: { 'by-createdAt': number; 'by-dictionary': string };
  };
  dictionaries: {
    key: string;
    value: IDictionary;
    indexes: { 'by-createdAt': number };
  };
}

const DB_NAME = 'nudo-words';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<WordsDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<WordsDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('words', { keyPath: 'id' });
          store.createIndex('by-createdAt', 'createdAt');
        }
        if (oldVersion < 2) {
          const dicts = db.createObjectStore('dictionaries', { keyPath: 'id' });
          dicts.createIndex('by-createdAt', 'createdAt');

          const words = tx.objectStore('words');
          words.createIndex('by-dictionary', 'dictionaryId');

          // Переносим уже существующие слова в словарь по умолчанию.
          const existing = await words.getAll();
          if (existing.length > 0) {
            const defaultDict: IDictionary = {
              id: uid(),
              name: 'Мои слова',
              createdAt: Date.now(),
            };
            await tx.objectStore('dictionaries').put(defaultDict);
            for (const w of existing) {
              w.dictionaryId = defaultDict.id;
              await words.put(w);
            }
          }
        }
      },
    });
  }
  return dbPromise;
}

function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* ---------- Словари ---------- */

export async function getAllDictionaries(): Promise<IDictionary[]> {
  const db = await getDB();
  return db.getAllFromIndex('dictionaries', 'by-createdAt');
}

export async function addDictionary(input: {
  name: string;
  description?: string;
}): Promise<IDictionary> {
  const db = await getDB();
  const dict: IDictionary = {
    id: uid(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    createdAt: Date.now(),
  };
  await db.put('dictionaries', dict);
  return dict;
}

/** Удаляет словарь вместе со всеми словами внутри него. */
export async function deleteDictionary(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['dictionaries', 'words'], 'readwrite');
  const words = await tx.objectStore('words').index('by-dictionary').getAllKeys(id);
  for (const key of words) {
    await tx.objectStore('words').delete(key);
  }
  await tx.objectStore('dictionaries').delete(id);
  await tx.done;
}

/** Количество записей в каждом словаре, ключ — id словаря. */
export async function getWordCounts(): Promise<Record<string, number>> {
  const db = await getDB();
  const words = await db.getAll('words');
  const counts: Record<string, number> = {};
  for (const w of words) {
    counts[w.dictionaryId] = (counts[w.dictionaryId] ?? 0) + 1;
  }
  return counts;
}

/* ---------- Слова ---------- */

/** Слова конкретного словаря, отсортированные по времени создания. */
export async function getWordsByDictionary(dictionaryId: string): Promise<IWord[]> {
  const db = await getDB();
  const words = await db.getAllFromIndex('words', 'by-dictionary', dictionaryId);
  return words.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Создаёт пару «слово ⇄ перевод» внутри словаря: две связанные записи IWord.
 */
export async function addPair(input: {
  dictionaryId: string;
  value: string;
  valueDescription?: string;
  translation: string;
  translationDescription?: string;
}): Promise<WordPair> {
  const db = await getDB();
  const now = Date.now();
  const wordId = uid();
  const translationId = uid();

  const word: IWord = {
    id: wordId,
    dictionaryId: input.dictionaryId,
    value: input.value.trim(),
    description: input.valueDescription?.trim() || undefined,
    links: [translationId],
    createdAt: now,
  };
  const translation: IWord = {
    id: translationId,
    dictionaryId: input.dictionaryId,
    value: input.translation.trim(),
    description: input.translationDescription?.trim() || undefined,
    links: [wordId],
    createdAt: now + 1,
  };

  const tx = db.transaction('words', 'readwrite');
  await Promise.all([tx.store.put(word), tx.store.put(translation), tx.done]);
  return { word, translation };
}

/** Данные одной пары для импорта. */
export interface PairInput {
  value: string;
  valueDescription?: string;
  translation: string;
  translationDescription?: string;
}

/**
 * Пакетно добавляет пары в словарь одной транзакцией. Возвращает число
 * добавленных пар.
 */
export async function importPairs(
  dictionaryId: string,
  pairs: PairInput[],
): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('words', 'readwrite');
  let now = Date.now();
  let added = 0;

  for (const p of pairs) {
    const value = p.value?.trim();
    const translation = p.translation?.trim();
    if (!value || !translation) continue;

    const wordId = uid();
    const translationId = uid();
    tx.store.put({
      id: wordId,
      dictionaryId,
      value,
      description: p.valueDescription?.trim() || undefined,
      links: [translationId],
      createdAt: now++,
    });
    tx.store.put({
      id: translationId,
      dictionaryId,
      value: translation,
      description: p.translationDescription?.trim() || undefined,
      links: [wordId],
      createdAt: now++,
    });
    added++;
  }

  await tx.done;
  return added;
}

/** Обновляет одну запись целиком. */
export async function updateWord(word: IWord): Promise<void> {
  const db = await getDB();
  await db.put('words', word);
}

/** Удаляет запись и вычищает ссылки на неё из связанных слов. */
export async function deleteWordWithLinks(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('words', 'readwrite');
  const target = await tx.store.get(id);
  if (!target) {
    await tx.done;
    return;
  }
  for (const linkedId of target.links) {
    const linked = await tx.store.get(linkedId);
    if (linked) {
      linked.links = linked.links.filter((l) => l !== id);
      await tx.store.put(linked);
    }
  }
  await tx.store.delete(id);
  await tx.done;
}

/**
 * Собирает пары для отображения в списке. Считаем «словом» ту запись,
 * что была создана первой (меньший createdAt), «переводом» — связанную.
 */
export function buildPairs(words: IWord[]): WordPair[] {
  const byId = new Map(words.map((w) => [w.id, w]));
  const seen = new Set<string>();
  const pairs: WordPair[] = [];

  for (const w of words) {
    if (seen.has(w.id)) continue;
    const partner = w.links.map((id) => byId.get(id)).find(Boolean);
    if (!partner) continue;
    seen.add(w.id);
    seen.add(partner.id);
    const [word, translation] =
      w.createdAt <= partner.createdAt ? [w, partner] : [partner, w];
    pairs.push({ word, translation });
  }
  return pairs;
}
