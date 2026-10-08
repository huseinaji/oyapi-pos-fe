import { Field, FieldDescription, FieldError, FieldLabel } from "#components/ui/field";

export function FormField({
  label,
  description,
  required,
  error,
  children,
}: {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Field>
      <FieldLabel>
        {label}
        {required && <span className="text-[var(--status-danger)]"> *</span>}
      </FieldLabel>
      {children}
      <FieldDescription>{description}</FieldDescription>
      {error && (
        <FieldError className="text-xs text-[var(--status-danger)]">{error}</FieldError>
      )}
    </Field>
  );
}