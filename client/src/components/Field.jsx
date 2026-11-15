import { useId } from 'react';
import Icon from './Icon.jsx';

/**
 * Labelled input with hint + error wired up for screen readers.
 * Pass `as="textarea"` or `as="select"` for other controls.
 */
export default function Field({ label, hint, error, as: Control = 'input', optional, className = '', children, ...props }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;

  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="field-optional">Optional</span>}
      </label>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      <Control
        id={id}
        className="field-control"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errId].filter(Boolean).join(' ') || undefined}
        {...props}
      >
        {children}
      </Control>
      {error && (
        <p id={errId} className="field-error">
          <Icon name="alert" size={16} /> {error}
        </p>
      )}
    </div>
  );
}
