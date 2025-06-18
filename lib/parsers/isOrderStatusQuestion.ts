// lib/parsers/isOrderStatusQuestion.ts
export function isOrderStatusQuestion(text: string): boolean {
  const statusPatterns = [
    // עברית - שאלות על סטטוס
    /הזמנות.*בסטטוס/i,
    /בסטטוס.*הזמנות/i,
    /הזמנות.*סטטוס/i,
    /סטטוס.*הזמנות/i,
    /אילו הזמנות/i,
    /איזה הזמנות/i,
    /הזמנות.*בייצור/i,
    /הזמנות.*נשלח/i,
    /הזמנות.*במכס/i,
    /הזמנות.*הושלם/i,
    
    // אנגלית
    /orders.*status/i,
    /status.*orders/i,
    /orders.*in.*status/i,
    /which.*orders/i,
    /what.*orders/i,
    
    // מספרי הזמנה
    /ORD-\d{4}-\d{3}/i,
    
    // סטטוסים ספציפיים
    /בייצור/i,
    /נשלח/i,
    /במכס/i,
    /הושלם/i,
    /production/i,
    /shipped/i,
    /customs/i,
    /completed/i
  ];
  
  return statusPatterns.some((pattern) => pattern.test(text));
}