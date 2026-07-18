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

const INPUT_ID = 'answer-real-input';

/**
 * Абсолютный индекс символа под точкой (x, y) внутри прокси, либо null.
 * Разбиение текста на две части помечено атрибутом data-base (сколько
 * символов идёт до этого span), поэтому итоговый индекс = base + offset.
 */
function charIndexFromPoint(x: number, y: number): number | null {
  const doc = document as Document & {
    caretRangeFromPoint?(x: number, y: number): Range | null;
    caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
  };

  let node: Node | null = null;
  let offset = 0;
  const range = doc.caretRangeFromPoint?.(x, y);
  if (range) {
    node = range.startContainer;
    offset = range.startOffset;
  } else {
    const pos = doc.caretPositionFromPoint?.(x, y);
    if (pos) {
      node = pos.offsetNode;
      offset = pos.offset;
    }
  }

  const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element | null);
  const base = el?.getAttribute('data-base');
  return base == null ? null : Number(base) + offset;
}

/**
 * Поле ответа, устойчивое к «прыжку» экрана на iOS.
 *
 * Настоящий <input> зафиксирован в самом верху экрана (там он уже виден над
 * клавиатурой), поэтому Safari при фокусе не проматывает страницу. Видимое
 * поле — это <label>, который через htmlFor фокусирует скрытый инпут и
 * отображает введённый текст с собственной кареткой.
 */
const AnswerInput = forwardRef<AnswerInputHandle, Props>(function AnswerInput(
  { value, onChange, onSubmit, placeholder, buttonText = 'Проверить' },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  // Позиция каретки = selectionStart скрытого инпута (двигается стрелками и
  // кликом, а не только в конце). Клампим на случай, если value стало короче.
  const [caret, setCaret] = useState(0);
  const caretPos = Math.min(caret, value.length);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus({ preventScroll: true }),
  }));

  const syncCaret = () => setCaret(inputRef.current?.selectionStart ?? value.length);

  // Клик/тап по видимому полю переносит каретку в точку нажатия.
  const handleClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    const idx = charIndexFromPoint(e.clientX, e.clientY);
    if (idx == null) return;
    const clamped = Math.max(0, Math.min(value.length, idx));
    input.setSelectionRange(clamped, clamped);
    setCaret(clamped);
  };

  return (
    <div className="answer-input">
      {/* Настоящий инпут — скрыт вверху страницы, но фокусируется и печатает */}
      <input
        id={INPUT_ID}
        ref={inputRef}
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

      {/* Видимый прокси: делит текст в позиции каретки и рисует её на стыке */}
      <label
        className={`answer-input__proxy${focused ? ' is-focused' : ''}`}
        htmlFor={INPUT_ID}
        onMouseDown={(e) => {
          // Не даём mousedown снять фокус с уже активного инпута (иначе каретка
          // пропадает). Первый фокус-жест не трогаем — важно для iOS.
          if (document.activeElement === inputRef.current) e.preventDefault();
        }}
        onClick={handleClick}
      >
        <span className="answer-input__value" data-base={0}>
          {value.slice(0, caretPos)}
        </span>
        {focused && <span className="answer-input__caret" aria-hidden />}
        <span className="answer-input__value" data-base={caretPos}>
          {value.slice(caretPos)}
        </span>
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
