import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Button } from 'antd';
import './AnswerInput.scss';

export interface AnswerInputHandle {
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  buttonText?: string;
}

/**
 * Поле ответа, устойчивое к «прыжку» экрана на iOS.
 *
 * Хитрость: настоящий <input> зафиксирован в самом верху экрана (там он уже
 * виден над клавиатурой), поэтому Safari при фокусе не проматывает страницу.
 * Видимое поле — это <label>, который через htmlFor нативно фокусирует
 * скрытый инпут и показывает введённый текст.
 */
const AnswerInput = forwardRef<AnswerInputHandle, Props>(function AnswerInput(
  { value, onChange, onSubmit, placeholder, buttonText = 'Проверить' },
  ref,
) {
  const realRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  // Позиция каретки = selectionStart скрытого инпута, чтобы её можно было
  // двигать стрелками, а не держать только в конце текста.
  const [caret, setCaret] = useState(0);

  useImperativeHandle(ref, () => ({
    focus: () => realRef.current?.focus({ preventScroll: true }),
  }));

  const syncCaret = () => setCaret(realRef.current?.selectionStart ?? value.length);

  return (
    <div className="answer-input">
      {/* Настоящий инпут — скрыт вверху страницы, но фокусируется и печатает */}
      <input
        id="answer-real-input"
        ref={realRef}
        className="answer-input__real"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
        onKeyUp={syncCaret}
        onSelect={syncCaret}
        onFocus={() => {
          setFocused(true);
          syncCaret();
        }}
        onBlur={() => setFocused(false)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {/* Видимый прокси: клик по label нативно фокусирует скрытый инпут */}
      <label
        className={`answer-input__proxy${focused ? ' is-focused' : ''}`}
        htmlFor="answer-real-input"
      >
        {focused ? (
          <>
            <span className="answer-input__value">{value.slice(0, caret)}</span>
            <span className="answer-input__caret" />
            <span className="answer-input__value">{value.slice(caret)}</span>
          </>
        ) : (
          value && <span className="answer-input__value">{value}</span>
        )}
        {!value && <span className="answer-input__placeholder">{placeholder}</span>}
      </label>
      <Button
        size="large"
        type="primary"
        onClick={onSubmit}
        style={{ borderRadius: '0 8px 8px 0' }}
      >
        {buttonText}
      </Button>
    </div>
  );
});

export default AnswerInput;
