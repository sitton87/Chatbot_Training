// lib/parsers/isOrderQuestion.ts
export function isOrderQuestion(text: string): boolean {
  const orderPatterns = [
    /הזמנ/i,
    /order/i,
    /ORD-/i,
    /מספר הזמנה/i,
    /סטטוס/i,
    /status/i,
  ];

  return orderPatterns.some((pattern) => pattern.test(text));
}
