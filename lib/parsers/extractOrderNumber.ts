// lib/parsers/extractOrderNumber.ts
export function extractOrderNumber(text: string): string | null {
  const orderNumberPattern = /ORD-\d{4}-\d{3}/i;
  const match = text.match(orderNumberPattern);
  return match ? match[0].toUpperCase() : null;
}
