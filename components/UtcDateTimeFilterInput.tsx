"use client";

import { useEffect, useState } from "react";

type Props = {
  name: string;
  initialValue?: string;
  autoSubmitOnChange?: boolean;
};

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function toUtcDateTimeLocalValue(raw?: string): string {
  if (!raw) {
    return "";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(
    date.getUTCHours()
  )}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function toIsoUtcValue(datetimeLocalValue: string): string {
  if (!datetimeLocalValue) {
    return "";
  }

  const date = new Date(`${datetimeLocalValue}Z`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

export function UtcDateTimeFilterInput({
  name,
  initialValue,
  autoSubmitOnChange = false
}: Props): JSX.Element {
  const initialDisplayValue = toUtcDateTimeLocalValue(initialValue);
  const [displayValue, setDisplayValue] = useState(initialDisplayValue);
  const [isoValue, setIsoValue] = useState(toIsoUtcValue(initialDisplayValue));

  useEffect(() => {
    const nextDisplayValue = toUtcDateTimeLocalValue(initialValue);
    setDisplayValue(nextDisplayValue);
    setIsoValue(toIsoUtcValue(nextDisplayValue));
  }, [initialValue]);

  return (
    <div>
      <input type="hidden" name={name} value={isoValue} />
      <input
        type="datetime-local"
        value={displayValue}
        step={1}
        className="utc-datetime-input h-9 rounded-md border border-input bg-input/50 px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        onChange={(event) => {
          const nextDisplay = event.target.value;
          const nextIso = toIsoUtcValue(nextDisplay);
          setDisplayValue(nextDisplay);
          setIsoValue(nextIso);

          if (autoSubmitOnChange && (nextDisplay === "" || nextIso.length > 0)) {
            const form = event.currentTarget.closest("form");
            if (form && form instanceof HTMLFormElement) {
              window.setTimeout(() => form.requestSubmit(), 0);
            }
          }
        }}
      />
    </div>
  );
}
