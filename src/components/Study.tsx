import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Space, Tag, Typography } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, RedoOutlined } from '@ant-design/icons';
import type { IWord } from '../types';
import { buildPairs } from '../db';
import AnswerInput, { type AnswerInputHandle } from './AnswerInput';
import './Study.scss';

const { Title, Text } = Typography;

interface Props {
  words: IWord[];
}

interface Question {
  prompt: IWord;
  answer: IWord;
}

const normalize = (s: string) => s.trim().toLowerCase();

export default function Study({ words }: Props) {
  const pairs = useMemo(() => buildPairs(words), [words]);

  const [question, setQuestion] = useState<Question | null>(null);
  const [guess, setGuess] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const inputRef = useRef<AnswerInputHandle>(null);

  const pickRandom = useCallback(() => {
    if (pairs.length === 0) {
      setQuestion(null);
      return;
    }
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    // Случайно решаем, что показать: слово или перевод.
    const [prompt, answer] =
      Math.random() < 0.5 ? [pair.word, pair.translation] : [pair.translation, pair.word];
    setQuestion({ prompt, answer });
    setGuess('');
    setFlipped(false);
    setCorrect(null);
  }, [pairs]);

  // Первый вопрос и повтор, когда набор слов изменился.
  useEffect(() => {
    pickRandom();
  }, [pickRandom]);

  useEffect(() => {
    // Автофокус только на десктопе: на тач-устройствах он раскрывает
    // клавиатуру и проматывает экран к полю. preventScroll — на всякий
    // случай, чтобы фокус не таскал страницу.
    const isTouch =
      typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    if (question && !flipped && !isTouch) {
      inputRef.current?.focus();
    }
  }, [question, flipped]);

  const check = () => {
    if (!question || flipped || !guess.trim()) return;
    const ok = normalize(guess) === normalize(question.answer.value);
    setCorrect(ok);
    setFlipped(true);
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1) }));
  };

  if (pairs.length === 0) {
    return <Empty description="Добавьте слова во вкладке «Мои слова», чтобы начать тренировку" />;
  }
  if (!question) return null;

  return (
    <Space
      className="study-layout"
      direction="vertical"
      size="large"
      align="center"
      style={{ width: '100%' }}
    >
      <div className="study-score">
        <span className="study-score__item study-score__item--right">
          <CheckCircleFilled />
          {score.right}
        </span>
        <span className="study-score__item study-score__item--wrong">
          <CloseCircleFilled />
          {score.wrong}
        </span>
      </div>

      <div className={`flip-card ${flipped ? 'is-flipped' : ''}`}>
        <div className="flip-card-inner">
          {/* Лицо: вопрос */}
          <div className="flip-card-face flip-card-front">
            <Text type="secondary">Переведите</Text>
            <Title level={1} style={{ margin: '8px 0' }}>
              {question.prompt.value}
            </Title>
            {question.prompt.description && <Tag>{question.prompt.description}</Tag>}
          </div>
          {/* Оборот: ответ */}
          <div
            className={`flip-card-face flip-card-back ${
              correct === null ? '' : correct ? 'is-correct' : 'is-wrong'
            }`}
          >
            {/* Содержимое оборота показываем только после ответа — иначе при
                перевороте к новому слову мелькала бы иконка неверного ответа. */}
            {correct !== null && (
              <>
                {correct ? (
                  <CheckCircleFilled style={{ fontSize: 32, color: '#52c41a' }} />
                ) : (
                  <CloseCircleFilled style={{ fontSize: 32, color: '#ff4d4f' }} />
                )}
                <Title level={2} style={{ margin: '8px 0' }}>
                  {question.answer.value}
                </Title>
                {question.answer.description && (
                  <Tag color="blue">{question.answer.description}</Tag>
                )}
                {!correct && (
                  <Text type="secondary" style={{ marginTop: 8 }}>
                    Ваш ответ: {guess || '—'}
                  </Text>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {!flipped ? (
        <AnswerInput
          ref={inputRef}
          value={guess}
          onChange={setGuess}
          onSubmit={check}
          placeholder="Введите перевод"
        />
      ) : (
        <Button size="large" type="primary" icon={<RedoOutlined />} onClick={pickRandom}>
          Следующее слово
        </Button>
      )}
    </Space>
  );
}
