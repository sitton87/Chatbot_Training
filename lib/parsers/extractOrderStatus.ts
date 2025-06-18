// lib/parsers/extractOrderStatus.ts
export function extractOrderStatus(text: string): string | null {
  const statusMap: Record<string, string> = {
    // וריאציות בעברית
    "בתהליך הזמנה": "בתהליך הזמנה",
    בתהליך: "בתהליך הזמנה",
    "הזמנה נשלחה": "הזמנה נשלחה",
    נשלחה: "הזמנה נשלחה",
    אושר: "אושר על ידי ספק",
    "אושר על ידי ספק": "אושר על ידי ספק",
    ייצור: "בייצור", // ← זה התיקון החשוב!
    בייצור: "בייצור",
    נשלח: "נשלח",
    במכס: "במכס",
    מכס: "במכס",
    שוחרר: "שוחרר ממכס",
    "שוחרר ממכס": "שוחרר ממכס",
    בדרך: "בדרך אלינו",
    "בדרך אלינו": "בדרך אלינו",
    הגיע: "הגיע למחסן",
    "הגיע למחסן": "הגיע למחסן",
    הושלם: "הושלם",
    פתוח: "פתוח", // כולל כל הסטטוסים שלא הושלמו
    פתוחות: "פתוח",

    // וריאציות באנגלית
    "in progress": "בתהליך הזמנה",
    progress: "בתהליך הזמנה",
    production: "בייצור",
    producing: "בייצור",
    shipped: "נשלח",
    customs: "במכס",
    completed: "הושלם",
    finished: "הושלם",
    open: "פתוח",
  };

  const lowerText = text.toLowerCase();

  // חפש התאמה מדויקת קודם
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
    { patterns: ["שוחרר", "released"], status: "שוחרר ממכס" },
    { patterns: ["הושלם", "completed"], status: "הושלם" },
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
