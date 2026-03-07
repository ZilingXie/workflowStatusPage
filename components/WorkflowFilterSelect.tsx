"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [value, setValue] = useState(initialValue);
  const [query, setQuery] = useState(initialValue.length === 0 ? allLabel : initialValue);
  const [open, setOpen] = useState(false);

  const normalizedOptions = useMemo(
    () =>
      Array.from(new Set(options.filter((option) => option.length > 0))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [options]
  );

  useEffect(() => {
    setValue(initialValue);
    setQuery(initialValue.length === 0 ? allLabel : initialValue);
  }, [initialValue, allLabel]);

  return (
    <div
      className="relative min-w-[130px]"
      onBlur={() => {
        window.setTimeout(() => setOpen(false), 120);
      }}
    >
      <input type="hidden" name={name} value={value} />
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setValue(next.trim() === allLabel ? "" : next);
          setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="h-9 w-full rounded-md border border-input bg-input/50 px-2 pr-8 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={placeholder ?? name}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label={`Toggle ${name} options`}
        onMouseDown={(event) => {
          event.preventDefault();
          setOpen((prev) => !prev);
        }}
      >
        <span className={`inline-block text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-y-auto rounded-md border border-input bg-card p-1 shadow-lg">
          <button
            type="button"
            className={`w-full rounded-sm px-2 py-1.5 text-left font-sans text-sm text-foreground transition-colors hover:bg-secondary ${
              value === "" ? "bg-secondary" : ""
            }`}
            onMouseDown={(event) => {
              event.preventDefault();
              setValue("");
              setQuery(allLabel);
              setOpen(false);

              if (autoSubmitOnSelect) {
                const form = event.currentTarget.closest("form");
                if (form && form instanceof HTMLFormElement) {
                  window.setTimeout(() => form.requestSubmit(), 0);
                }
              }
            }}
          >
            {allLabel}
          </button>
          {normalizedOptions.length === 0 ? (
            <div className="px-2 py-1.5 font-sans text-sm text-muted-foreground">No option found</div>
          ) : (
            normalizedOptions.map((option) => (
              <button
                type="button"
                key={option}
                className={`w-full rounded-sm px-2 py-1.5 text-left font-sans text-sm text-foreground transition-colors hover:bg-secondary ${
                  value === option ? "bg-secondary" : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setValue(option);
                  setQuery(option);
                  setOpen(false);

                  if (autoSubmitOnSelect) {
                    const form = event.currentTarget.closest("form");
                    if (form && form instanceof HTMLFormElement) {
                      window.setTimeout(() => form.requestSubmit(), 0);
                    }
                  }
                }}
              >
                {option}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
