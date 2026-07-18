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

  // Клик/тап по прокси: вычисляем индекс символа под курсором и переносим
  // туда каретку скрытого инпута. Так работает и мышью, и пальцем на мобилке.
  const positionCaret = (e: React.MouseEvent<HTMLLabelElement>) => {
    const input = realRef.current;
    if (!input) return;

    const doc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
    };

    let node: Node | null = null;
    let offset = 0;
    const range = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (range) {
      node = range.startContainer;
      offset = range.startOffset;
    } else {
      const pos = doc.caretPositionFromPoint?.(e.clientX, e.clientY);
      if (pos) {
        node = pos.offsetNode;
        offset = pos.offset;
      }
    }

    const span = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element | null);
    const base = span?.getAttribute('data-base');
    if (base == null) {
      input.focus({ preventScroll: true });
      return;
    }

    const idx = Math.max(0, Math.min(value.length, Number(base) + offset));
    input.focus({ preventScroll: true });
    input.setSelectionRange(idx, idx);
    setCaret(idx);
  };

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
        onMouseDown={(e) => {
          // Не даём mousedown увести фокус с уже сфокусированного инпута —
          // иначе каретка мигает/пропадает. Первый фокус (жест) не трогаем.
          if (document.activeElement === realRef.current) e.preventDefault();
        }}
        onClick={positionCaret}
      >
        {focused ? (
          <>
            <span className="answer-input__value" data-base={0}>
              {value.slice(0, caret)}
            </span>
            <span className="answer-input__caret" />
            <span className="answer-input__value" data-base={caret}>
              {value.slice(caret)}
            </span>
          </>
        ) : (
          value && (
            <span className="answer-input__value" data-base={0}>
              {value}
            </span>
          )
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
