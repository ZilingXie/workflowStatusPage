"use client";

import { useEffect, useState } from "react";

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
  const initialText =
    initialValue.length === 0 && emptyOptionLabel ? emptyOptionLabel : initialValue;
  const [value, setValue] = useState(initialValue);
  const [query, setQuery] = useState(initialText);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const nextText =
      initialValue.length === 0 && emptyOptionLabel ? emptyOptionLabel : initialValue;
    setValue(initialValue);
    setQuery(nextText);
  }, [emptyOptionLabel, initialValue]);

  return (
    <div className="workflow-combobox" onBlur={() => setTimeout(() => setOpen(false), 120)}>
      <input type="hidden" name={name} value={value} />
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          if (emptyOptionLabel && next.trim() === emptyOptionLabel) {
            setValue("");
          } else {
            setValue(next);
          }
          setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="button"
        className={`workflow-combobox-trigger ${open ? "open" : ""}`}
        aria-label="Toggle workflow options"
        onMouseDown={(event) => {
          event.preventDefault();
          setOpen((prev) => !prev);
        }}
      >
        <span aria-hidden>▾</span>
      </button>

      {open ? (
        <div className="workflow-combobox-menu">
          {options.length === 0 ? (
            <div className="workflow-combobox-empty">No option found</div>
          ) : (
            options.map((option) => {
              const label = option.length === 0 ? (emptyOptionLabel ?? "") : option;
              const key = option.length === 0 ? "__empty__" : option;

              return (
              <button
                type="button"
                key={key}
                className={`workflow-combobox-item ${value === option ? "active" : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setValue(option);
                  setQuery(label);
                  setOpen(false);

                  if (autoSubmitOnSelect) {
                    const form = event.currentTarget.closest("form");
                    if (form && form instanceof HTMLFormElement) {
                      window.setTimeout(() => form.requestSubmit(), 0);
                    }
                  }
                }}
              >
                {label}
              </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
