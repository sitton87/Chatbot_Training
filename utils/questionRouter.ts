// utils/questionRouter.ts
import { isExpiryQuestion } from "@/lib/parsers/isExpiryQuestion";
import { isOrderQuestion } from "@/lib/parsers/isOrderQuestion";
import { isCountQuestion } from "@/lib/parsers/isCountQuestion";
import { extractCountries } from "@/lib/parsers/extractCountry";

export type HandlerType = "license" | "order" | "supplier" | "unknown";

export interface QuestionContext {
  type: HandlerType;
  countries: string[];
  hasCountryContext: boolean;
  isCountQuery: boolean;
  confidence: number;
}

export async function routeQuestion(
  question: string
): Promise<QuestionContext> {
  console.log("🔍 Routing question:", question);

  // זיהוי מדינות
  let countries: string[] = [];
  try {
    countries = await extractCountries(question);
  } catch (error) {
    console.error("Error extracting countries:", error);
  }

  const hasCountryContext = countries.length > 0;
  const isCountQuery = isCountQuestion(question);

  // לוגיקת ניתוב
  let type: HandlerType = "unknown";
  let confidence = 0;

  // עדיפות 1: רישיונות (לא צריכים מדינה)
  if (isExpiryQuestion(question)) {
    type = "license";
    confidence = 0.9;
  }
  // עדיפות 2: הזמנות
  else if (isOrderQuestion(question)) {
    type = "order";
    confidence = 0.85;
  }
  // עדיפות 3: ספקים
  else if (hasCountryContext || isSupplierQuestion(question)) {
    type = "supplier";
    confidence = hasCountryContext ? 0.8 : 0.7;
  }

  const context: QuestionContext = {
    type,
    countries,
    hasCountryContext,
    isCountQuery,
    confidence,
  };

  console.log("📊 Question context:", context);
  return context;
}

function isSupplierQuestion(question: string): boolean {
  const supplierPatterns = [/ספקים/i, /supplier/i, /ספק/i];

  return supplierPatterns.some((pattern) => pattern.test(question));
}
