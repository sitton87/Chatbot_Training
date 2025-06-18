// utils/aiQueryProcessor.ts
import { hebrewTranslator } from "./hebrewTranslator";

interface QueryResult {
  sql: string;
  confidence: number;
  translatedQuery?: string;
  originalQuery: string;
}

interface SQLTemplate {
  pattern: string[];
  sql: string;
  description: string;
}

class AIQueryProcessor {
  private sqlTemplates: SQLTemplate[] = [
    // ספירת ספקים
    {
      pattern: ["how many", "suppliers", "china"],
      sql: "SELECT COUNT(*) FROM suppliers WHERE country = 'China'",
      description: "Count suppliers in China",
    },
    {
      pattern: ["how many", "suppliers", "germany"],
      sql: "SELECT COUNT(*) FROM suppliers WHERE country = 'Germany'",
      description: "Count suppliers in Germany",
    },
    {
      pattern: ["how many", "suppliers"],
      sql: "SELECT COUNT(*) FROM suppliers",
      description: "Count all suppliers",
    },

    // ספירת הזמנות
    {
      pattern: ["how many", "orders"],
      sql: "SELECT COUNT(*) FROM orders",
      description: "Count all orders",
    },
    {
      pattern: ["orders", "unpaid"],
      sql: "SELECT * FROM orders WHERE payment_status = 'pending'",
      description: "Unpaid orders",
    },
    {
      pattern: ["orders", "production"],
      sql: "SELECT * FROM orders WHERE status = 'בייצור'",
      description: "Orders in production",
    },

    // שאילתות מורכבות עם JOINs
    {
      pattern: ["suppliers", "germany", "orders"],
      sql: "SELECT DISTINCT s.name FROM suppliers s JOIN orders o ON s.id = o.supplier_id WHERE s.country = 'Germany'",
      description: "German suppliers with orders",
    },
    {
      pattern: ["orders", "production", "china"],
      sql: "SELECT o.* FROM orders o JOIN suppliers s ON o.supplier_id = s.id WHERE o.status = 'בייצור' AND s.country = 'China'",
      description: "Orders in production from China",
    },
    {
      pattern: ["suppliers", "china", "orders"],
      sql: "SELECT s.name, COUNT(o.id) as order_count FROM suppliers s JOIN orders o ON s.id = o.supplier_id WHERE s.country = 'China' GROUP BY s.name",
      description: "Chinese suppliers with order count",
    },

    // שאילתות סכום
    {
      pattern: ["total", "amount", "orders"],
      sql: "SELECT SUM(total_amount) FROM orders",
      description: "Total amount of all orders",
    },
    {
      pattern: ["average", "amount"],
      sql: "SELECT AVG(total_amount) FROM orders",
      description: "Average order amount",
    },

    // רישיונות
    {
      pattern: ["licenses", "expired"],
      sql: "SELECT COUNT(*) FROM suppliers WHERE license_expiry < CURRENT_DATE",
      description: "Count expired licenses",
    },
    {
      pattern: ["licenses", "month"],
      sql: "SELECT COUNT(*) FROM suppliers WHERE MONTH(license_expiry) = MONTH(CURRENT_DATE) AND YEAR(license_expiry) = YEAR(CURRENT_DATE)",
      description: "Licenses expiring this month",
    },
  ];

  processQuery(originalQuery: string): QueryResult {
    console.log(`🧠 Processing query: ${originalQuery}`);

    let queryToProcess = originalQuery;
    let translatedQuery: string | undefined;

    // תרגום אם זה עברית
    const language = hebrewTranslator.detectLanguage(originalQuery);
    if (language === "hebrew") {
      translatedQuery = hebrewTranslator.translateToEnglish(originalQuery);
      queryToProcess = translatedQuery;
      console.log(`🔄 Translated query: ${translatedQuery}`);
    }

    // המרה לאותיות קטנות לחיפוש
    const lowerQuery = queryToProcess.toLowerCase();

    // חיפוש התבנית הטובה ביותר
    let bestMatch: SQLTemplate | null = null;
    let bestScore = 0;

    for (const template of this.sqlTemplates) {
      const score = this.calculatePatternScore(lowerQuery, template.pattern);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = template;
      }
    }

    if (bestMatch && bestScore >= 2) {
      console.log(
        `✅ Found match: ${bestMatch.description} (score: ${bestScore})`
      );

      return {
        sql: bestMatch.sql,
        confidence: Math.min(bestScore / bestMatch.pattern.length, 1),
        translatedQuery,
        originalQuery,
      };
    }

    console.log(`❌ No suitable pattern found (best score: ${bestScore})`);

    // Fallback לשאילתה בסיסית
    return {
      sql: "SELECT 'Query not understood' as message",
      confidence: 0,
      translatedQuery,
      originalQuery,
    };
  }

  private calculatePatternScore(query: string, pattern: string[]): number {
    let score = 0;

    for (const keyword of pattern) {
      if (query.includes(keyword.toLowerCase())) {
        score++;
      }
    }

    return score;
  }

  // פונקציה להוספת תבניות חדשות
  addTemplate(pattern: string[], sql: string, description: string): void {
    this.sqlTemplates.push({ pattern, sql, description });
    console.log(`➕ Added new template: ${description}`);
  }

  // פונקציה לקבלת כל התבניות (לdebug)
  getTemplates(): SQLTemplate[] {
    return this.sqlTemplates;
  }
}

export const aiQueryProcessor = new AIQueryProcessor();
