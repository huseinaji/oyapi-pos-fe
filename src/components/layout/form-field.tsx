import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';

export function FormField({
  label,
  htmlFor,
  description,
  required,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  description?: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Field className={className}>
      <FieldLabel htmlFor={htmlFor}>
        {label}
        {required && <span className="text-[var(--status-danger)]"> *</span>}
      </FieldLabel>
      {children}
      <FieldDescription>{description}</FieldDescription>
      {error && (
        <FieldError className="text-xs text-[var(--status-danger)]">
          {error}
        </FieldError>
      )}
    </Field>
  );
}
