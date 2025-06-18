// pages/api/query-ai.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

import { extractCountry, extractCountries } from "@/lib/parsers/extractCountry";
import { extractMonthRange } from "@/lib/parsers/extractMonthRange";
import { isCountQuestion } from "@/lib/parsers/isCountQuestion";
import { isExpiryQuestion } from "@/lib/parsers/isExpiryQuestion";
import { formatCountReply } from "@/lib/parsers/formatCountReply";
import { getSuppliersByCountry } from "@/lib/parsers/getSuppliersByCountry";
import { isHebrewQuestion } from "@/lib/parsers/isHebrewQuestion";

import { isOrderQuestion } from "@/lib/parsers/isOrderQuestion";
import { isOrderCountQuestion } from "@/lib/parsers/isOrderCountQuestion";
import { isOrderStatusQuestion } from "@/lib/parsers/isOrderStatusQuestion";
import { extractOrderNumber } from "@/lib/parsers/extractOrderNumber";
import { extractOrderStatus } from "@/lib/parsers/extractOrderStatus";
import { isFinancialQuestion } from "@/lib/parsers/isFinancialQuestion";
import { getOrdersByStatus } from "@/lib/parsers/getOrdersByStatus";
import { getOrderByNumber } from "@/lib/parsers/getOrderByNumber";

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // בדיקת method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // בדיקת body
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      console.error("❌ Missing or invalid question:", req.body);
      return res.status(400).json({ error: "חסרה שאלה או שהשאלה לא תקינה" });
    }

    console.log("📝 Question received:", question);

    // בדיקת חיבור למסד נתונים
    try {
      await prisma.$connect();
      console.log("✅ Database connected");
    } catch (dbError) {
      console.error("❌ Database connection failed:", dbError);
      return res.status(500).json({ error: "שגיאה בחיבור למסד הנתונים" });
    }

    // =================
    // שאלות על רישיונות (עדיפות ראשונה - לא צריכות מדינה)
    // =================
    if (isExpiryQuestion(question)) {
      try {
        const { start, end } = extractMonthRange(question);
        console.log("📅 Date range:", { start, end });

        const expiringSuppliers = await prisma.supplier.findMany({
          where: {
            licenseExpiry: {
              gte: start,
              lte: end,
            },
          },
          select: {
            name: true,
            country: true,
            licenseExpiry: true,
          },
        });

        console.log(
          `📋 Found ${expiringSuppliers.length} suppliers with expiring licenses`
        );

        const isHebrew = /[\u0590-\u05FF]/.test(question);
        let reply;

        if (expiringSuppliers.length === 0) {
          reply = isHebrew
            ? "אין ספקים שתוקף רישיון הייבוא שלהם מסתיים בתקופה זו."
            : "No suppliers have their import license expiring in this period.";
        } else {
          const list = expiringSuppliers
            .map(
              (s) =>
                `- ${s.name} (${
                  s.country
                }) - תוקף עד: ${s.licenseExpiry?.toLocaleDateString("he-IL")}`
            )
            .join("\n");
          reply = isHebrew
            ? `נמצאו ${expiringSuppliers.length} ספקים שתוקף רישיון הייבוא שלהם מסתיים:\n${list}`
            : `Found ${expiringSuppliers.length} suppliers whose import license expires:\n${list}`;
        }

        return res.status(200).json({ reply });
      } catch (expiryError) {
        console.error("❌ Error checking license expiry:", expiryError);
        return res.status(500).json({ error: "שגיאה בבדיקת תוקף רישיונות" });
      }
    }

    // =================
    // שאלות על הזמנות
    // =================
    if (isOrderQuestion(question)) {
      console.log("📦 Detected order question");

      // שאלת סטטוס הזמנה ספציפית
      if (isOrderStatusQuestion(question)) {
        const orderNumber = extractOrderNumber(question);

        if (orderNumber) {
          try {
            const order = await getOrderByNumber(orderNumber);

            if (!order) {
              return res.status(200).json({
                reply: `לא נמצאה הזמנה עם מספר ${orderNumber}`,
              });
            }

            const reply = `הזמנה ${order.orderNumber}:
ספק: ${order.supplier.name} (${order.supplier.country})
סטטוס: ${order.status}
סכום: ${order.totalAmount.toString()} ${order.originalCurrency}
תאריך משלוח צפוי: ${order.etaFinal.toLocaleDateString("he-IL")}
${order.containerNumber ? `מכולה: ${order.containerNumber}` : ""}
${order.notes ? `הערות: ${order.notes}` : ""}`;

            return res.status(200).json({ reply });
          } catch (error) {
            console.error("❌ Error fetching order by number:", error);
            return res.status(500).json({ error: "שגיאה בשליפת הזמנה" });
          }
        }
      }

      // שאלת ספירת הזמנות
      if (isOrderCountQuestion(question)) {
        try {
          // זיהוי סטטוס (אופציונלי)
          const status = extractOrderStatus(question);
          console.log("🔍 Extracted status:", status);

          let count;
          let reply;

          if (status) {
            if (status === "פתוח") {
              count = await prisma.order.count({
                where: {
                  status: {
                    not: "הושלם",
                  },
                },
              });
              reply = `יש לנו ${count} הזמנות פתוחות (שלא הושלמו)`;
            } else {
              count = await prisma.order.count({
                where: {
                  status: {
                    equals: status,
                    mode: "insensitive",
                  },
                },
              });
              reply = `יש לנו ${count} הזמנות בסטטוס "${status}"`;
            }
          } else {
            // ספירה כללית
            count = await prisma.order.count();
            const openCount = await prisma.order.count({
              where: {
                status: { not: "הושלם" },
              },
            });
            reply = `יש לנו סה"כ ${count} הזמנות, מתוכן ${openCount} פתוחות`;
          }

          console.log(`📊 Order count result:`, count);
          return res.status(200).json({ reply });
        } catch (error) {
          console.error("❌ Error counting orders:", error);
          return res.status(500).json({ error: "שגיאה בספירת הזמנות" });
        }
      }

      // שאלות על הזמנות לפי סטטוס
      const status = extractOrderStatus(question);
      if (status) {
        try {
          const orders = await getOrdersByStatus(status);
          console.log(
            `📋 Found ${orders.length} orders with status: ${status}`
          );

          if (orders.length === 0) {
            return res.status(200).json({
              reply: `לא נמצאו הזמנות בסטטוס "${status}"`,
            });
          }

          let reply = `נמצאו ${orders.length} הזמנות בסטטוס "${status}":\n\n`;
          orders.forEach((order) => {
            reply += `${order.orderNumber} - ${order.supplier.name} (${order.supplier.country})\n`;
            reply += `   סכום: ${order.totalAmount.toString()} ${
              order.originalCurrency
            }\n`;
            reply += `   תאריך משלוח: ${order.etaFinal.toLocaleDateString(
              "he-IL"
            )}\n\n`;
          });

          return res.status(200).json({ reply });
        } catch (error) {
          console.error("❌ Error fetching orders by status:", error);
          return res.status(500).json({ error: "שגיאה בשליפת הזמנות" });
        }
      }

      // שאלות כספיות על הזמנות
      if (isFinancialQuestion(question)) {
        try {
          const totalValue = await prisma.order.aggregate({
            _sum: { totalAmount: true },
            _avg: { totalAmount: true },
            _count: true,
          });

          const openValue = await prisma.order.aggregate({
            where: {
              status: { not: "הושלם" },
            },
            _sum: { totalAmount: true },
            _count: true,
          });

          const reply = `סיכום כספי של הזמנות:

סה"כ ערך כל ההזמנות: ${totalValue._sum.totalAmount?.toString() || "0"}
ממוצע הזמנה: ${
            totalValue._avg.totalAmount
              ? Math.round(Number(totalValue._avg.totalAmount)).toLocaleString()
              : "0"
          }
מספר הזמנות: ${totalValue._count}

הזמנות פתוחות: ${openValue._count}
ערך הזמנות פתוחות: ${openValue._sum.totalAmount?.toString() || "0"}

הערה: סכומים במטבעות מעורבים`;

          return res.status(200).json({ reply });
        } catch (error) {
          console.error("❌ Error calculating financial data:", error);
          return res.status(500).json({ error: "שגיאה בחישוב נתונים כספיים" });
        }
      }

      // שאלה כללית על הזמנות
      try {
        const recentOrders = await prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            supplier: {
              select: { name: true, country: true },
            },
          },
        });

        let reply = `5 ההזמנות האחרונות:\n\n`;
        recentOrders.forEach((order) => {
          reply += `${order.orderNumber} - ${order.supplier.name} (${order.supplier.country})\n`;
          reply += `סטטוס: ${order.status} | ${order.totalAmount.toString()} ${
            order.originalCurrency
          }\n\n`;
        });

        return res.status(200).json({ reply });
      } catch (error) {
        console.error("❌ Error fetching recent orders:", error);
        return res.status(500).json({ error: "שגיאה בשליפת הזמנות" });
      }
    }

    // =================
    // שאלות על ספקים
    // =================

    // זיהוי מדינות (יכול להיות מספר מדינות)
    let countries: string[] = [];
    let country: string | null = null;

    try {
      countries = await extractCountries(question);
      country = countries.length > 0 ? countries[0] : null;
      console.log("🌍 Countries extracted:", countries);
    } catch (extractError) {
      console.error("❌ Error extracting countries:", extractError);
      // fallback לזיהוי מדינה אחת
      try {
        country = await extractCountry(question);
        if (country) countries = [country];
      } catch (fallbackError) {
        console.error("❌ Fallback extraction failed:", fallbackError);
      }
    }

    // שאלת ספירה לפי מדינות
    if (isCountQuestion(question) && countries.length > 0) {
      try {
        // אם יש מספר מדינות, ספור לכל אחת
        if (countries.length > 1) {
          const countResults = await Promise.all(
            countries.map(async (countryName) => {
              const count = await prisma.supplier.count({
                where: {
                  country: {
                    equals: countryName,
                    mode: "insensitive",
                  },
                },
              });
              return { country: countryName, count };
            })
          );

          console.log("📊 Multi-country count results:", countResults);

          const isHebrew = /[\u0590-\u05FF]/.test(question);
          let reply = "";

          if (isHebrew) {
            reply = "הנה הספירה לפי מדינות:\n";
            countResults.forEach(({ country, count }) => {
              reply += `• ${country}: ${count} ספקים\n`;
            });

            const totalCount = countResults.reduce(
              (sum, { count }) => sum + count,
              0
            );
            reply += `\nסה"כ: ${totalCount} ספקים`;
          } else {
            reply = "Here's the count by country:\n";
            countResults.forEach(({ country, count }) => {
              reply += `• ${country}: ${count} suppliers\n`;
            });

            const totalCount = countResults.reduce(
              (sum, { count }) => sum + count,
              0
            );
            reply += `\nTotal: ${totalCount} suppliers`;
          }

          return res.status(200).json({ reply });
        }
        // מדינה אחת בלבד
        else {
          const count = await prisma.supplier.count({
            where: {
              country: {
                equals: countries[0],
                mode: "insensitive",
              },
            },
          });

          console.log(`📊 Count result for ${countries[0]}:`, count);
          const reply = formatCountReply(question, countries[0], count);
          return res.status(200).json({ reply });
        }
      } catch (countError) {
        console.error("❌ Error counting suppliers:", countError);
        return res.status(500).json({ error: "שגיאה בספירת ספקים" });
      }
    }

    // שליפה רגילה של ספקים לפי מדינה
    if (country) {
      try {
        const suppliers = await getSuppliersByCountry(country);
        console.log(`📋 Found ${suppliers.length} suppliers in ${country}`);

        // אם אין ספקים, תן תשובה פשוטה
        if (suppliers.length === 0) {
          return res.status(200).json({
            reply: `אין ספקים במדינה ${country} במסד הנתונים.`,
          });
        }

        // יצירת תשובה עם OpenAI
        try {
          const chatResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "אתה עוזר עסקי שמסביר למשתמש בעברית על ספקים בהתאם לשאלה. תן תשובה קצרה וברורה.",
              },
              {
                role: "user",
                content: `השאלה: "${question}"\nהספקים במדינה ${country}:\n${JSON.stringify(
                  suppliers.map((s) => ({
                    name: s.name,
                    city: s.city,
                    contactPerson: s.contactPerson,
                  })),
                  null,
                  2
                )}`,
              },
            ],
          });

          const reply =
            chatResponse.choices[0]?.message?.content ||
            `נמצאו ${suppliers.length} ספקים במדינה ${country}`;

          return res.status(200).json({ reply });
        } catch (openaiError) {
          console.error("❌ OpenAI error:", openaiError);
          // fallback בלי OpenAI
          const supplierNames = suppliers.map((s) => s.name).join(", ");
          return res.status(200).json({
            reply: `נמצאו ${suppliers.length} ספקים במדינה ${country}: ${supplierNames}`,
          });
        }
      } catch (supplierError) {
        console.error("❌ Error fetching suppliers:", supplierError);
        return res.status(500).json({ error: "שגיאה בשליפת ספקים" });
      }
    }

    // אם לא זוהתה מדינה ולא שאלת רישיונות או הזמנות - תשובה כללית
    return res.status(400).json({
      error:
        "לא הצלחתי להבין את השאלה. אני יכול לעזור עם שאלות על ספקים, הזמנות ורישיונות.",
    });
  } catch (error: any) {
    console.error("❌ General error in query-ai:", error);
    return res.status(500).json({
      error: "שגיאה כללית בשרת",
      details: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}
