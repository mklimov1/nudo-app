import { forwardRef } from 'react';
import { Button, Input, Space, type InputRef } from 'antd';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  buttonText?: string;
}

/**
 * Поле ответа: нативный antd Input + кнопка отправки.
 *
 * На iOS Safari проматывает страницу к полю при фокусе — откатываем прокрутку
 * к верху с небольшой задержкой (контент тренировки и так начинается сверху).
 */
const AnswerInput = forwardRef<InputRef, Props>(function AnswerInput(
  { value, onChange, onSubmit, placeholder, buttonText = 'Проверить' },
  ref,
) {
  const undoIosScroll = () => {
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  return (
    <Space.Compact style={{ width: 340, maxWidth: '100%' }}>
      <Input
        ref={ref}
        size="large"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPressEnter={onSubmit}
        onFocus={undoIosScroll}
        onTouchStart={undoIosScroll}
        autoComplete="off"
      />
      <Button size="large" type="primary" onClick={onSubmit}>
        {buttonText}
      </Button>
    </Space.Compact>
  );
});

export default AnswerInput;
