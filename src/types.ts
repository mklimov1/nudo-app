export interface IWord {
  /** Уникальный идентификатор записи */
  id: string;
  /** Словарь («папка»), которому принадлежит запись */
  dictionaryId: string;
  /** Само слово или его перевод */
  value: string;
  /** Комментарий/пояснение к слову (необязательно) */
  description?: string;
  /** id записей, с которыми связано это слово (переводы и т.п.) */
  links: string[];
  /** Метка времени создания — для сортировки */
  createdAt: number;
}

/** Словарь — контейнер («папка») для слов. */
export interface IDictionary {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

/** Пара «слово ⇄ перевод», как её видит пользователь в списке. */
export interface WordPair {
  word: IWord;
  translation: IWord;
}
