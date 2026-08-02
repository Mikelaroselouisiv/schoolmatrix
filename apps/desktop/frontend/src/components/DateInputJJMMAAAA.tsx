"use client";

import { useState, useRef } from "react";
import { toDisplayDateJJMMAAAA, parseJJMMAAAAToIso } from "@/src/lib/format";

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  required?: boolean;
};

/**
 * Champ date affichant et acceptant le format JJ/MM/AAAA.
 * La valeur interne reste YYYY-MM-DD pour les APIs.
 */
export function DateInputJJMMAAAA({
  value,
  onChange,
  placeholder = "JJ/MM/AAAA",
  id,
  className = "",
  required = false,
}: Props) {
  const [localText, setLocalText] = useState<string | null>(null);
  const isFocused = useRef(false);

  const displayValue =
    localText !== null
      ? localText
      : toDisplayDateJJMMAAAA(value);

  const handleFocus = () => {
    isFocused.current = true;
    setLocalText(toDisplayDateJJMMAAAA(value) || "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalText(e.target.value);
    const parsed = parseJJMMAAAAToIso(e.target.value);
    if (parsed) onChange(parsed);
  };

  const handleBlur = () => {
    isFocused.current = false;
    const parsed = parseJJMMAAAAToIso(displayValue);
    if (parsed) {
      onChange(parsed);
    } else if (displayValue.trim() === "") {
      onChange("");
    }
    setLocalText(null);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      required={required}
      maxLength={10}
    />
  );
}
