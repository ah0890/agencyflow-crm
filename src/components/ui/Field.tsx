"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Form primitives.
 *
 * `Field` owns the label / hint / error chrome and wires up `id`,
 * `aria-describedby` and `aria-invalid` so screen readers announce errors
 * without every form repeating that plumbing.
 */

const CONTROL_BASE =
  "w-full rounded-[var(--radius)] border bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] " +
  "placeholder:text-[var(--text-subtle)] transition-colors duration-150 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

type FieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-[var(--text-muted)]"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-[var(--danger)]" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-subtle)]">{hint}</p>
      ) : null}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  prefix?: string;
};

export function TextInput({
  label,
  error,
  hint,
  required,
  className,
  prefix,
  ...rest
}: TextInputProps) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  const describedBy = error || hint ? `${id}-help` : undefined;

  return (
    <Field
      label={label}
      htmlFor={id}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-subtle)]">
            {prefix}
          </span>
        ) : null}
        <input
          {...rest}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            CONTROL_BASE,
            "h-10",
            prefix && "pl-7",
            error
              ? "border-[var(--danger)]"
              : "border-[var(--border)] hover:border-[var(--border-strong)]",
          )}
        />
      </div>
      {describedBy ? <span id={describedBy} className="sr-only" /> : null}
    </Field>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
};

export function SelectInput({
  label,
  error,
  hint,
  required,
  className,
  options,
  placeholder,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const id = rest.id ?? autoId;

  return (
    <Field
      label={label}
      htmlFor={id}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <select
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          CONTROL_BASE,
          "h-10 cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23939aab%22 stroke-width=%222%22 stroke-linecap=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9",
          error
            ? "border-[var(--danger)]"
            : "border-[var(--border)] hover:border-[var(--border-strong)]",
        )}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextareaInput({
  label,
  error,
  hint,
  required,
  className,
  rows = 3,
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const id = rest.id ?? autoId;

  return (
    <Field
      label={label}
      htmlFor={id}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <textarea
        {...rest}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(
          CONTROL_BASE,
          "resize-y py-2.5",
          error
            ? "border-[var(--danger)]"
            : "border-[var(--border)] hover:border-[var(--border-strong)]",
        )}
      />
    </Field>
  );
}

/** Checkbox with its label, used for toggles inside forms. */
export function CheckboxInput({
  label,
  description,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
}) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <div className="flex items-start gap-3">
      <input
        {...rest}
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-[var(--border-strong)] bg-[var(--surface-2)] accent-[var(--accent)]"
      />
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-sm text-[var(--text)]">{label}</span>
        {description ? (
          <span className="block text-xs text-[var(--text-muted)]">
            {description}
          </span>
        ) : null}
      </label>
    </div>
  );
}
