type Props = {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  required?: boolean;
};

/**
 * Sélecteur date (calendrier natif). Valeur API : YYYY-MM-DD.
 */
export function DateInputJJMMAAAA({
  value,
  onChange,
  id,
  className = "",
  required = false,
}: Props) {
  return (
    <input
      type="date"
      id={id}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      required={required}
    />
  );
}
