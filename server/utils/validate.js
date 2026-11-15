// Explicit request validation. We don't rely on Mongoose validators alone,
// because the in-memory dev fallback and partial updates can bypass them.

export class ValidationError extends Error {
  constructor(errors, message) {
    super(message || Object.values(errors)[0] || 'Please check the highlighted fields.');
    this.status = 400;
    this.errors = errors;
  }
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ID_RE = /^[a-f\d]{24}$/i;

export const isId = (v) => typeof v === 'string' && ID_RE.test(v);

export function isRealDate(v) {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Collects field errors; call .throwIfAny() at the end. */
export function checker() {
  const errors = {};
  return {
    errors,
    require(field, value, message) {
      if (value === undefined || value === null || value === '') errors[field] ??= message;
      return this;
    },
    check(field, ok, message) {
      if (!ok) errors[field] ??= message;
      return this;
    },
    throwIfAny() {
      if (Object.keys(errors).length) throw new ValidationError(errors);
    },
  };
}

export function validatePatient(body = {}) {
  const name = str(body.name);
  const phone = str(body.phone);
  const email = str(body.email).toLowerCase();
  const digits = phone.replace(/\D/g, '');
  const c = checker();

  c.require('name', name, 'Please tell us your name.')
    .check('name', !name || (name.length >= 2 && name.length <= 80), 'Name should be 2–80 characters.')
    .require('phone', phone, 'We need a phone number in case we have to reach you.')
    .check(
      'phone',
      !phone || (/^[\d\s()+.-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15),
      'That phone number doesn’t look right.'
    )
    .require('email', email, 'Your confirmation goes to this email.')
    .check('email', !email || (EMAIL_RE.test(email) && email.length <= 120), 'That email doesn’t look right.')
    .check(
      'newPatient',
      typeof body.newPatient === 'boolean',
      'Let us know if you’ve visited Smilo before.'
    );

  return { c, patient: { name, phone, email, newPatient: body.newPatient === true } };
}
