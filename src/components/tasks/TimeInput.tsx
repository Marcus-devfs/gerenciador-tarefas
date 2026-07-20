"use client";

import { useState } from "react";

interface TimeInputProps {
  /** Value in hours (decimal), as string. Empty string when unset. */
  value: string;
  /** Called with the new value in hours (decimal), as string. */
  onChange: (hoursValue: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

/** Round to 2 decimals to keep the stored hours value clean regardless of the unit used to type it. */
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default function TimeInput({ value, onChange, onBlur, placeholder, className = "", inputClassName = "" }: TimeInputProps) {
  const [unit, setUnit] = useState<"h" | "min">("h");

  const displayValue =
    value === "" ? "" : unit === "h" ? value : String(Math.round(Number(value) * 60));

  function handleInput(raw: string) {
    if (raw === "") {
      onChange("");
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    onChange(unit === "h" ? raw : round2(num / 60).toString());
  }

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <input
        type="number"
        min="0"
        step={unit === "h" ? "0.5" : "1"}
        value={displayValue}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`flex-1 min-w-0 ${inputClassName}`}
      />
      <div className="flex rounded-lg border border-surface-200 overflow-hidden shrink-0 text-[10px] font-semibold">
        <button
          type="button"
          onClick={() => setUnit("h")}
          className={`px-2 transition-colors ${unit === "h" ? "bg-brand-500 text-white" : "bg-white text-surface-500 hover:bg-surface-50"}`}
        >
          h
        </button>
        <button
          type="button"
          onClick={() => setUnit("min")}
          className={`px-2 transition-colors ${unit === "min" ? "bg-brand-500 text-white" : "bg-white text-surface-500 hover:bg-surface-50"}`}
        >
          min
        </button>
      </div>
    </div>
  );
}
