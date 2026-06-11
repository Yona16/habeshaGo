export function required(value, label = "Field") {
  if (value === undefined || value === null || String(value).trim() === "") {
    return `${label} is required.`;
  }
  return "";
}

export function email(value, label = "Email") {
  if (!value) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()) ? "" : `${label} must be a valid email address.`;
}

export function phoneET(value, label = "Phone") {
  if (!value) return "";
  return /^\+251\d{9}$/.test(String(value).replace(/\s+/g, "")) ? "" : `${label} must use Ethiopian format, for example +251911222333.`;
}

export function positiveNumber(value, label = "Amount") {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? "" : `${label} must be greater than 0.`;
}

export function validate(values, rules) {
  const errors = {};
  for (const [key, validators] of Object.entries(rules)) {
    const message = validators.map((validator) => validator(values[key], key)).find(Boolean);
    if (message) errors[key] = message;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export const HabeshaGoValidation = { required, email, phoneET, positiveNumber, validate };
window.HabeshaGoValidation = HabeshaGoValidation;
