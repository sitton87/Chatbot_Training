// lib/parsers/isFinancialQuestion.ts
export function isFinancialQuestion(text: string): boolean {
  const financialPatterns = [
    /סכום/i,
    /כסף/i,
    /ממוצע/i,
    /total.*amount/i,
    /sum/i,
    /money/i,
    /cost/i,
    /value/i,
    /average/i,
  ];

  return financialPatterns.some((pattern) => pattern.test(text));
}
