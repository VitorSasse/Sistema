import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { classNames } from "@/lib/class-names";

type InputState = "default" | "error" | "success" | "loading";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  description?: string;
  error?: string;
  label?: string;
  leading?: ReactNode;
  state?: InputState;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, description, error, id, label, leading, state = "default", ...props },
  ref
) {
  const resolvedState = error ? "error" : state;
  const fieldId = id ?? props.name;
  const helperId = fieldId ? `${fieldId}-helper` : undefined;

  return (
    <label className={classNames("ui-field", `ui-field-${resolvedState}`)} htmlFor={fieldId}>
      {label ? <span className="ui-field-label">{label}</span> : null}
      <span className="ui-input-shell">
        {leading ? <span className="ui-input-leading">{leading}</span> : null}
        <input
          ref={ref}
          id={fieldId}
          className={classNames("ui-input", className)}
          aria-invalid={resolvedState === "error" || undefined}
          aria-describedby={error || description ? helperId : undefined}
          {...props}
        />
        {resolvedState === "loading" ? <LoaderCircle className="ui-field-state ui-field-spinner" size={17} /> : null}
        {resolvedState === "success" ? <CheckCircle2 className="ui-field-state" size={17} /> : null}
        {resolvedState === "error" ? <CircleAlert className="ui-field-state" size={17} /> : null}
      </span>
      {error || description ? (
        <small id={helperId} className="ui-field-helper">
          {error ?? description}
        </small>
      ) : null}
    </label>
  );
});
