"use client";

type Props = {
  name: string;
  initialValue?: string;
  options: string[];
  placeholder?: string;
  emptyOptionLabel?: string;
  autoSubmitOnSelect?: boolean;
};

export function WorkflowFilterSelect({
  name,
  initialValue = "",
  options,
  placeholder,
  emptyOptionLabel,
  autoSubmitOnSelect = false
}: Props): JSX.Element {
  const allLabel = emptyOptionLabel ?? "All";

  return (
    <select
      name={name}
      value={initialValue}
      onChange={(event) => {
        if (autoSubmitOnSelect) {
          const form = event.currentTarget.closest("form");
          if (form && form instanceof HTMLFormElement) {
            window.setTimeout(() => form.requestSubmit(), 0);
          }
        }
      }}
      className="h-9 min-w-[130px] rounded-md border border-input bg-input/50 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label={placeholder ?? name}
    >
      <option value="">{allLabel}</option>
      {options
        .filter((option) => option.length > 0)
        .map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
    </select>
  );
}
