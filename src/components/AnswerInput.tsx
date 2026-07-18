import { forwardRef, useImperativeHandle, useRef } from 'react';
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

  useImperativeHandle(ref, () => ({
    focus: () => realRef.current?.focus({ preventScroll: true }),
  }));

  return (
    <div className="answer-input">
      {/* Настоящий инпут — скрыт вверху страницы, но фокусируется и печатает */}
      <input
        id="answer-real-input"
        ref={realRef}
        className="answer-input__real"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {/* Видимый прокси: клик по label нативно фокусирует скрытый инпут */}
      <label className="answer-input__proxy" htmlFor="answer-real-input">
        {value ? (
          <span className="answer-input__value">{value}</span>
        ) : (
          <span className="answer-input__placeholder">{placeholder}</span>
        )}
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
