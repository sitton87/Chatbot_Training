// lib/parsers/isOrderStatusQuestion.ts
export function isOrderStatusQuestion(text: string): boolean {
  const statusPatterns = [
    /סטטוס.*הזמנה/i,
    /מה הסטטוס/i,
    /status.*order/i,
    /order.*status/i,
    /ORD-\d{4}-\d{3}/i, // זיהוי מספר הזמנה
  ];

  return statusPatterns.some((pattern) => pattern.test(text));
}
