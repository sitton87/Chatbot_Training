// lib/parsers/isFinancialQuestion.ts
export function isFinancialQuestion(text: string): boolean {
  const financialPatterns = [
    // עברית
    /סכום/i,
    /כסף/i,
    /שווי/i,
    /ערך/i,
    /כספי/i,
    /מחיר/i,
    /עלות/i,
    /ממוצע/i,
    /סה״כ/i,
    /סהכ/i,
    /כולל/i,
    
    // אנגלית
    /total.*amount/i,
    /sum/i,
    /money/i,
    /cost/i,
    /value/i,
    /average/i,
    /financial/i,
    /price/i,
    
    // ביטויים
    /מה.*סכום/i,
    /כמה.*כסף/i,
    /מה.*ערך/i,
    /what.*total/i,
    /how much.*money/i
  ];
  
  return financialPatterns.some((pattern) => pattern.test(text));
}