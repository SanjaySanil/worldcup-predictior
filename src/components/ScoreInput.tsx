import { useRef } from 'react';

interface ScoreInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  locked?: boolean;
}

export default function ScoreInput({ value, onChange, disabled, locked }: ScoreInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 0 && v <= 99) {
      onChange(v);
    } else if (e.target.value === '') {
      onChange(0);
    }
  };

  const handleFocus = () => {
    inputRef.current?.select();
  };

  return (
    <input
      ref={inputRef}
      type="number"
      min={0}
      max={99}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      disabled={disabled || locked}
      className={`score-input ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
      placeholder="-"
    />
  );
}
