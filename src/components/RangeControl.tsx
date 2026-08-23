import type { CSSProperties } from "react";

type RangeControlProps = {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
};

export function RangeControl({
  id,
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix = "",
  onChange,
}: RangeControlProps) {
  const progress = ((value - min) / Math.max(1, max - min)) * 100;
  return (
    <div className="range-control" style={{ "--range-progress": `${progress}%` } as CSSProperties}>
      <div className="range-label-row">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{value}{suffix}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </div>
  );
}
