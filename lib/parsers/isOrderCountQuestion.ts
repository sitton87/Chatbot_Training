// lib/parsers/isOrderCountQuestion.ts
export function isOrderCountQuestion(text: string): boolean {
  const countPatterns = [
    /כמה הזמנות/i,
    /מספר הזמנות/i,
    /how many orders/i,
    /count.*orders/i,
  ];

  return countPatterns.some((pattern) => pattern.test(text));
}
