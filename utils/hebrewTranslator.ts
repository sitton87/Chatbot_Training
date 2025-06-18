// utils/hebrewTranslator.ts

interface TranslationMapping {
  [key: string]: string;
}

class HebrewTranslator {
  private hebrewToEnglish: TranslationMapping = {
    // שאלות בסיס
    כמה: "how many",
    מה: "what",
    איזה: "which",
    איך: "how",
    אילו: "which",
    מי: "who",

    // ספקים
    ספקים: "suppliers",
    ספק: "supplier",
    יצרן: "manufacturer",
    יצרנים: "manufacturers",
    חברה: "company",
    חברות: "companies",

    // הזמנות
    הזמנות: "orders",
    הזמנה: "order",
    הזמנת: "order",
    רכישה: "purchase",
    רכישות: "purchases",

    // פעלים
    יש: "are there",
    "יש לנו": "do we have",
    לנו: "us",
    שיש: "that have",
    עם: "with",
    בלי: "without",
    ללא: "without",

    // מדינות
    בסין: "in China",
    מסין: "from China",
    בגרמניה: "in Germany",
    מגרמניה: "from Germany",
    בארהב: "in USA",
    'בארה"ב': "in USA",
    מארהב: "from USA",
    בספרד: "in Spain",
    ברוסיה: "in Russia",
    ביפן: "in Japan",
    בהודו: "in India",
    באיטליה: "in Italy",
    מאיטליה: "from Italy",

    // סכומים וכסף
    סכום: "amount",
    סכומים: "amounts",
    כסף: "money",
    כולל: "total",
    הכולל: "total",
    ממוצע: "average",

    // תשלומים
    שולמו: "paid",
    שולם: "paid",
    "לא שולמו": "unpaid",
    "לא שולם": "unpaid",
    תשלום: "payment",
    תשלומים: "payments",

    // סטטוסים
    סטטוס: "status",
    מצב: "status",
    בייצור: "in production",
    ייצור: "production",
    נשלח: "shipped",
    במכס: "in customs",
    הושלם: "completed",
    פתוחות: "open",
    סגורות: "closed",

    // רישיונות
    רישיון: "license",
    רישיונות: "licenses",
    תוקף: "validity",
    פג: "expired",
    פגה: "expired",
    מסתיים: "expires",

    // זמן
    היום: "today",
    אתמול: "yesterday",
    מחר: "tomorrow",
    השבוע: "this week",
    החודש: "this month",
    השנה: "this year",
    "השנה האחרונה": "last year",
  };

  private englishToHebrew: TranslationMapping = {
    // הפוך מהמיפוי למעלה
    suppliers: "ספקים",
    supplier: "ספק",
    orders: "הזמנות",
    order: "הזמנה",
    total: "כולל",
    amount: "סכום",
    paid: "שולמו",
    unpaid: "לא שולמו",
    "in China": "בסין",
    "in Germany": "בגרמניה",
    "in USA": 'בארה"ב',
    completed: "הושלמו",
    production: "ייצור",
    shipped: "נשלח",
    license: "רישיון",
    licenses: "רישיונות",
    expired: "פג תוקף",
  };

  translateToEnglish(hebrewText: string): string {
    console.log(`🔄 Translating to English: ${hebrewText}`);

    let text = hebrewText.trim();

    // תחילה, החלף ביטויים של יותר ממילה אחת
    for (const [hebrew, english] of Object.entries(this.hebrewToEnglish)) {
      if (hebrew.includes(" ")) {
        text = text.replace(new RegExp(hebrew, "g"), english);
      }
    }

    // אחר כך מילים בודדות
    const words = text.split(" ");
    const translatedWords = words.map((word) => {
      const cleanWord = word.replace(/[?.,!:]/g, "");
      const punctuation = word.replace(cleanWord, "");

      const translation = this.hebrewToEnglish[cleanWord];
      return translation ? translation + punctuation : word;
    });

    const result = translatedWords.join(" ");
    console.log(`✅ English result: ${result}`);
    return result;
  }

  translateToHebrew(englishText: string): string {
    console.log(`🔄 Translating to Hebrew: ${englishText}`);

    let text = englishText;

    // החלף ביטויים ומילים באנגלית לעברית
    for (const [english, hebrew] of Object.entries(this.englishToHebrew)) {
      text = text.replace(new RegExp(english, "gi"), hebrew);
    }

    console.log(`✅ Hebrew result: ${text}`);
    return text;
  }

  isHebrew(text: string): boolean {
    // בדוק אם יש תווים עבריים
    return /[\u0590-\u05FF]/.test(text);
  }

  detectLanguage(text: string): "hebrew" | "english" {
    return this.isHebrew(text) ? "hebrew" : "english";
  }
}

export const hebrewTranslator = new HebrewTranslator();
