// pages/api/query-ai.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { hebrewTranslator } from "@/utils/hebrewTranslator";
import { aiQueryProcessor } from "@/utils/aiQueryProcessor";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Missing question" });
  }

  console.log(`📝 Question received: ${question}`);
  console.log(
    `🌍 Language detected: ${hebrewTranslator.detectLanguage(question)}`
  );

  try {
    // שלב 1: עיבוד השאילתה עם AI
    const queryResult = aiQueryProcessor.processQuery(question);

    console.log(`🧠 AI Processing result:`, {
      sql: queryResult.sql,
      confidence: queryResult.confidence,
      translated: queryResult.translatedQuery,
    });

    // שלב 2: אם ה-confidence נמוך, נסה Smart Router
    if (queryResult.confidence < 0.6) {
      console.log(
        `⚡ Low confidence (${queryResult.confidence}), trying Smart Router...`
      );

      const smartRouterResult = await trySmartRouter(question);
      if (smartRouterResult.success) {
        return res.status(200).json({ reply: smartRouterResult.reply });
      }
    }

    // שלב 3: ביצוע ה-SQL במסד הנתונים
    if (queryResult.confidence >= 0.4) {
      try {
        const sqlResult = await executeSQLQuery(queryResult.sql);

        if (sqlResult.success) {
          // תרגום התשובה חזרה לעברית אם צריך
          let finalReply = sqlResult.reply;

          if (hebrewTranslator.detectLanguage(question) === "hebrew") {
            finalReply = hebrewTranslator.translateToHebrew(finalReply);
          }

          return res.status(200).json({
            reply: finalReply,
            metadata: {
              sql_used: queryResult.sql,
              confidence: queryResult.confidence,
              translated_query: queryResult.translatedQuery,
            },
          });
        }
      } catch (sqlError) {
        console.error(`❌ SQL execution failed:`, sqlError);
      }
    }

    // שלב 4: Fallback לתשובה כללית
    const language = hebrewTranslator.detectLanguage(question);
    const fallbackMessage =
      language === "hebrew"
        ? "לא הצלחתי להבין את השאלה. אני יכול לעזור עם שאלות על ספקים, הזמנות ורישיונות."
        : "I couldn't understand the question. I can help with questions about suppliers, orders, and licenses.";

    return res.status(400).json({ error: fallbackMessage });
  } catch (error: any) {
    console.error("❌ General error in query-ai:", error);
    return res.status(500).json({
      error: "שגיאה כללית בשרת",
      details: error.message,
    });
  }
}

// פונקציה לביצוע SQL במסד הנתונים
async function executeSQLQuery(
  sql: string
): Promise<{ success: boolean; reply: string }> {
  try {
    console.log(`🔧 Executing SQL: ${sql}`);

    // זיהוי סוג השאילתה
    const sqlUpper = sql.toUpperCase();

    if (sqlUpper.includes("COUNT(*)") && sqlUpper.includes("SUPPLIERS")) {
      // ספירת ספקים
      if (sqlUpper.includes("WHERE COUNTRY")) {
        const countryMatch = sql.match(/country\s*=\s*['"](.*?)['"]/i);
        const country = countryMatch ? countryMatch[1] : null;

        if (country) {
          const count = await prisma.supplier.count({
            where: { country: { equals: country, mode: "insensitive" } },
          });
          return {
            success: true,
            reply:
              count === 0
                ? `אין ספקים במדינה ${country}`
                : `יש ${count} ספקים במדינה ${country}`,
          };
        }
      } else {
        const totalCount = await prisma.supplier.count();
        return {
          success: true,
          reply: `יש לנו סה"כ ${totalCount} ספקים במערכת`,
        };
      }
    } else if (sqlUpper.includes("COUNT(*)") && sqlUpper.includes("ORDERS")) {
      // ספירת הזמנות
      const totalOrders = await prisma.order.count();
      return {
        success: true,
        reply: `יש לנו סה"כ ${totalOrders} הזמנות במערכת`,
      };
    } else if (sqlUpper.includes("SUM(TOTAL_AMOUNT)")) {
      // סכום כולל של הזמנות
      const result = await prisma.order.aggregate({
        _sum: { totalAmount: true },
      });

      const total = result._sum.totalAmount || 0;
      return {
        success: true,
        reply: `הסכום הכולל של ההזמנות: ${Number(total).toLocaleString()} ש"ח`,
      };
    } else if (
      sqlUpper.includes("PAYMENT_STATUS") &&
      sqlUpper.includes("PENDING")
    ) {
      // הזמנות שלא שולמו
      const unpaidOrders = await prisma.order.findMany({
        where: { paymentStatus: "pending" },
        include: { supplier: { select: { name: true } } },
        take: 10,
      });

      if (unpaidOrders.length === 0) {
        return { success: true, reply: "אין הזמנות שלא שולמו" };
      }

      const ordersList = unpaidOrders
        .map(
          (order) =>
            `• הזמנה ${order.orderNumber}: ${order.supplier?.name} - ${Number(
              order.totalAmount
            ).toLocaleString()} ש"ח`
        )
        .join("\n");

      return {
        success: true,
        reply: `הזמנות שלא שולמו:\n${ordersList}`,
      };
    } else if (
      sqlUpper.includes("JOIN") &&
      sqlUpper.includes("SUPPLIERS") &&
      sqlUpper.includes("ORDERS")
    ) {
      // שאילתות מורכבות עם JOIN
      if (sqlUpper.includes("GERMANY")) {
        const germanSuppliers = await prisma.supplier.findMany({
          where: { country: "Germany" },
          include: {
            orders: {
              where: { status: { not: "הושלם" } },
              take: 5,
            },
          },
        });

        const suppliersWithOrders = germanSuppliers.filter(
          (s) => s.orders.length > 0
        );

        if (suppliersWithOrders.length === 0) {
          return { success: true, reply: "אין ספקים מגרמניה עם הזמנות פתוחות" };
        }

        const list = suppliersWithOrders
          .map((s) => `• ${s.name} (${s.orders.length} הזמנות פתוחות)`)
          .join("\n");

        return {
          success: true,
          reply: `ספקים מגרמניה עם הזמנות פתוחות:\n${list}`,
        };
      }

      if (sqlUpper.includes("CHINA")) {
        const chineseSuppliers = await prisma.supplier.findMany({
          where: { country: "China" },
          include: {
            orders: { take: 5 },
          },
        });

        const suppliersWithOrders = chineseSuppliers.filter(
          (s) => s.orders.length > 0
        );

        if (suppliersWithOrders.length === 0) {
          return { success: true, reply: "אין ספקים מסין עם הזמנות" };
        }

        const list = suppliersWithOrders
          .map((s) => `• ${s.name} (${s.orders.length} הזמנות)`)
          .join("\n");

        return {
          success: true,
          reply: `ספקים מסין עם הזמנות:\n${list}`,
        };
      }
    }

    // אם לא מצאנו התאמה ספציפית
    return {
      success: false,
      reply: "לא הצלחתי לבצע את השאילתה",
    };
  } catch (error) {
    console.error(`❌ SQL execution error:`, error);
    return {
      success: false,
      reply: "שגיאה בביצוע השאילתה",
    };
  }
}

// Smart Router לשאלות פשוטות (גיבוי)
async function trySmartRouter(
  question: string
): Promise<{ success: boolean; reply: string }> {
  const lowerQuestion = question.toLowerCase();

  // דפוסים פשוטים
  if (
    lowerQuestion.includes("כמה ספקים") ||
    lowerQuestion.includes("how many suppliers")
  ) {
    if (lowerQuestion.includes("סין") || lowerQuestion.includes("china")) {
      const count = await prisma.supplier.count({
        where: { country: { equals: "China", mode: "insensitive" } },
      });
      return {
        success: true,
        reply: `יש ${count} ספקים בסין`,
      };
    } else {
      const count = await prisma.supplier.count();
      return {
        success: true,
        reply: `יש לנו סה"כ ${count} ספקים במערכת`,
      };
    }
  }

  if (
    lowerQuestion.includes("כמה הזמנות") ||
    lowerQuestion.includes("how many orders")
  ) {
    const count = await prisma.order.count();
    return {
      success: true,
      reply: `יש לנו סה"כ ${count} הזמנות במערכת`,
    };
  }

  return { success: false, reply: "" };
}
