// lib/parsers/extractOrderStatus.ts
export function extractOrderStatus(text: string): string | null {
  const statusMap: Record<string, string> = {
    // ויזואליזציות עבריות
    "הזמנות בסטטוס": "הזמנות בסטטוס",
    "בייצור": "בייצור",
    "ייצור": "בייצור", 
    "הזמנות נשלח": "הזמנות נשלח",
    "נשלח": "נשלח",
    "במכס": "במכס",
    "מכס": "במכס",
    "שוחרר": "שוחרר מהמכס",
    "שוחרר מהמכס": "שוחרר מהמכס",
    "הושלם": "הושלם",
    "בדרך": "בדרך ליעד",
    "בדרך ליעד": "בדרך ליעד",
    "הגיע": "הגיע למחסן",
    "הגיע למחסן": "הגיע למחסן",
    "פתוח": "פתוח",
    "פתוחות": "פתוח", // גם ביצורת רבים
    
    // ויזואליזציות אנגליות
    "in progress": "בייצור",
    "progress": "בייצור",
    "production": "בייצור",
    "producing": "בייצור",
    "shipped": "נשלח",
    "customs": "במכס",
    "completed": "הושלם",
    "finished": "הושלם",
    "open": "פתוח",
    "pending": "ממתין",
    "processing": "בעיבוד"
  };

  const lowerText = text.toLowerCase();
  
  // חפש התאמה קודם
  for (const [pattern, status] of Object.entries(statusMap)) {
    if (lowerText.includes(pattern.toLowerCase())) {
      console.log(`🎯 Status match found: "${pattern}" -> "${status}"`);
      return status;
    }
  }

  // אם לא נמצא, חפש חלקי
  const partialMatches = [
    { patterns: ["ייצור", "יצור", "production"], status: "בייצור" },
    { patterns: ["מכס", "customs"], status: "במכס" },
    { patterns: ["נשלח", "shipped"], status: "נשלח" },
    { patterns: ["שוחרר", "released"], status: "שוחרר מהמכס" },
    { patterns: ["הושלם", "completed"], status: "הושלם" },
    { patterns: ["פתוח", "open"], status: "פתוח" }
  ];

  for (const { patterns, status } of partialMatches) {
    if (patterns.some((pattern) => lowerText.includes(pattern))) {
      console.log(`🎯 Partial status match found: -> "${status}"`);
      return status;
    }
  }

  console.log("❌ No status found in text:", text);
  return null;
}