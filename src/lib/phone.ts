function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhoneE164(input: string): string {
  const raw = input.trim();
  if (!raw) return "";

  if (raw.startsWith("+")) {
    const normalizedDigits = digitsOnly(raw);
    return normalizedDigits ? `+${normalizedDigits}` : "";
  }

  const normalizedDigits = digitsOnly(raw);
  if (!normalizedDigits) return "";

  if (normalizedDigits.length === 10) return `+1${normalizedDigits}`;
  if (normalizedDigits.length === 11 && normalizedDigits.startsWith("1")) {
    return `+${normalizedDigits}`;
  }

  return `+${normalizedDigits}`;
}

export function formatPhoneDisplay(input: string | null | undefined): string {
  if (!input) return "";
  const digits = digitsOnly(input);
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  if (input.startsWith("+")) return `+${digits}`;
  return input;
}
