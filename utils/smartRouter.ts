// utils/smartRouter.ts
import { extractCountries } from "@/lib/parsers/extractCountry";

export interface RouterResponse {
  action: string;
  filters?: Record<string, any>;
  message?: string;
}

export class SmartChatbotRouter {
  private patterns: Record<string, string[]>;
  private statusMap: Record<string, string>;

  constructor() {
    this.patterns = {
      // ספקים - ספירה כללית
      count_suppliers_general: [
        "כמה ספקים(?!\\s*ב)",
        "how many suppliers(?!\\s*in)",
        "מספר ספקים(?!\\s*ב)",
      ],

      // ספקים לפי מדינה
      count_suppliers_country: [
        'כמה ספקים.*?ב(סין|גרמניה|ארה"?ב|איטליה|ספרד|רוסיה)',
        'ספקים.*?ב(סין|גרמניה|ארה"?ב|איטליה|ספרד|רוסיה)',
        "how many suppliers.*?in\\s*(china|germany|usa|italy|spain|russia)",
        "suppliers.*?in\\s*(china|germany|usa|italy|spain|russia)",
      ],

      // הזמנות
      count_orders_general: [
        "כמה הזמנות(?!\\s*ב)",
        "how many orders(?!\\s*in)",
        "מספר הזמנות",
      ],

      orders_by_status: [
        "הזמנות.*?(בסטטוס|סטטוס).*?(בייצור|ייצור|נשלח|במכס|הושלם)",
        "orders.*?(status|in).*?(production|shipped|customs|completed)",
        "אילו הזמנות.*?(בייצור|ייצור|נשלח|במכס)",
      ],

      // רישיונות
      license_expiry: [
        "רישיון.*?(תוקף|פג)",
        "תוקף.*?רישיון",
        "license.*?expir",
        "פג.*?תוקף",
      ],

      // שאלות לא רלוונטיות
      irrelevant: ["מזג.*?אוויר", "weather", "בדיחה", "joke", "שעה", "time"],
    };

    this.statusMap = {
      בייצור: "בייצור",
      ייצור: "בייצור",
      נשלח: "נשלח",
      שולח: "נשלח",
      במכס: "במכס",
      מכס: "במכס",
      הושלם: "הושלם",
      הושלמה: "הושלם",
      production: "בייצור",
      shipped: "נשלח",
      customs: "במכס",
      completed: "הושלם",
    };
  }

  // 🎯 הפונקציה הראשית צריכה להיות async כי אנחנו משתמשים ב-await
  async classifyQuestion(question: string): Promise<RouterResponse> {
    const questionLower = question.toLowerCase();

    for (const [intent, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern, "i");
        if (regex.test(questionLower)) {
          return await this.generateResponse(intent, question);
        }
      }
    }

    return {
      action: "error",
      message:
        "לא הצלחתי להבין את השאלה. אני יכול לעזור עם שאלות על ספקים, הזמנות ורישיונות",
    };
  }

  // 🎯 הפונקציה הזו גם צריכה להיות async
  private async generateResponse(
    intent: string,
    question: string
  ): Promise<RouterResponse> {
    const questionLower = question.toLowerCase();

    switch (intent) {
      case "count_suppliers_general":
        return { action: "count_suppliers", filters: {} };

      case "count_suppliers_country":
        // 🎯 עכשיו נוכל להשתמש ב-await
        const countries = await extractCountries(question);
        console.log(
          `🔍 Extracted countries: ${countries} from question: ${question}`
        );

        if (countries.length === 1) {
          return {
            action: "count_suppliers",
            filters: { country: countries[0] },
          };
        } else if (countries.length > 1) {
          return {
            action: "count_suppliers_multiple",
            filters: { countries: countries },
          };
        } else {
          return { action: "count_suppliers", filters: {} };
        }

      case "count_orders_general":
        return { action: "count_orders", filters: {} };

      case "orders_by_status":
        const status = this.extractStatus(questionLower);
        return {
          action: "list_orders",
          filters: status ? { status } : {},
        };

      case "license_expiry":
        return {
          action: "list_suppliers",
          filters: { license_expires: "this_month" },
        };

      case "irrelevant":
        return {
          action: "error",
          message: "אני יכול לעזור רק עם שאלות על ספקים, הזמנות ורישיונות",
        };

      default:
        return {
          action: "error",
          message: "לא הצלחתי להבין את השאלה",
        };
    }
  }

  private extractStatus(question: string): string | null {
    for (const [statusInput, statusOutput] of Object.entries(this.statusMap)) {
      if (question.includes(statusInput)) {
        return statusOutput;
      }
    }
    return null;
  }
}
