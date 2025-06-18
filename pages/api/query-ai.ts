// pages/api/query-ai.ts - גרסה מתוקנת ומסודרת
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
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

// === פונקציות עזר ===

function hasCountryMention(question: string): boolean {
  const countryKeywords = [
    "בסין",
    "מסין",
    "china",
    "בגרמניה",
    "מגרמניה",
    "germany",
    "ברוסיה",
    "מרוסיה",
    "russia",
    "בספרד",
    "מספרד",
    "spain",
    "בארהב",
    'בארה"ב',
    "usa",
    "america",
    "באיטליה",
    "מאיטליה",
    "italy",
  ];

  return countryKeywords.some((keyword) =>
    question.toLowerCase().includes(keyword.toLowerCase())
  );
}

// === Handler Functions ===

async function handleGeneralSupplierCount(res: NextApiResponse) {
  try {
    const totalSuppliers = await prisma.supplier.count();
    const activeSuppliers = await prisma.supplier.count({
      where: { isActive: true },
    });

    const reply =
      activeSuppliers < totalSuppliers
        ? `יש לנו סה"כ ${totalSuppliers} ספקים במערכת, מתוכם ${activeSuppliers} פעילים`
        : `יש לנו סה"כ ${totalSuppliers} ספקים במערכת`;

    console.log(
      `✅ General count result: ${totalSuppliers} total, ${activeSuppliers} active`
    );
    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error("❌ Error in general supplier count:", error);
    return res.status(500).json({ error: "שגיאה בספירת ספקים" });
  }
}

async function handleSupplierCountByCountry(
  countries: string[],
  res: NextApiResponse
) {
  try {
    if (countries.length === 1) {
      // מדינה אחת
      const country = countries[0];
      const count = await prisma.supplier.count({
        where: {
          country: {
            equals: country,
            mode: "insensitive",
          },
        },
      });

      const reply =
        count === 0
          ? `אין ספקים במדינה ${country}`
          : `יש ${count} ספקים במדינה ${country}`;

      console.log(`✅ Single country result - ${country}: ${count} suppliers`);
      return res.status(200).json({ reply });
    } else {
      // מדינות מרובות
      const results = await Promise.all(
        countries.map(async (country) => {
          const count = await prisma.supplier.count({
            where: {
              country: {
                equals: country,
                mode: "insensitive",
              },
            },
          });
          return { country, count };
        })
      );

      const resultLines = results.map((r) => `${r.country}: ${r.count} ספקים`);
      const totalCount = results.reduce((sum, r) => sum + r.count, 0);

      const reply = `הנה הספירה לפי מדינות:\n• ${resultLines.join(
        "\n• "
      )}\n\nסה"כ: ${totalCount} ספקים`;

      console.log(`✅ Multiple countries result:`, results);
      return res.status(200).json({ reply });
    }
  } catch (error: any) {
    console.error("❌ Error in country supplier count:", error);
    return res.status(500).json({ error: "שגיאה בספירת ספקים לפי מדינה" });
  }
}

async function handleOrderCount(question: string, res: NextApiResponse) {
  try {
    const totalOrders = await prisma.order.count();
    const reply = `יש לנו סה"כ ${totalOrders} הזמנות במערכת`;

    console.log(`✅ Order count result: ${totalOrders}`);
    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error("❌ Error in order count:", error);
    return res.status(500).json({ error: "שגיאה בספירת הזמנות" });
  }
}

async function handleOrdersByStatus(question: string, res: NextApiResponse) {
  try {
    const status = extractOrderStatus(question);

    if (!status) {
      return res.status(400).json({ error: "לא הצלחתי לזהות את הסטטוס הרצוי" });
    }

    // בדוק אם זו שאלת ספירה או רשימה
    const isCountQuestion =
      question.includes("כמה") ||
      question.includes("how many") ||
      question.includes("מספר");

    const isListQuestion =
      question.includes("אילו") ||
      question.includes("מה הרשימה") ||
      question.includes("הראה לי") ||
      question.includes("תן לי") ||
      question.includes("which") ||
      question.includes("show me") ||
      question.includes("list");

    if (isCountQuestion) {
      // ספירה בלבד - מחזיר מספר
      const count = await prisma.order.count({
        where: { status },
      });

      const reply = `יש ${count} הזמנות בסטטוס "${status}"`;
      console.log(
        `✅ Orders count by status: ${count} orders with status ${status}`
      );
      return res.status(200).json({ reply });
    } else {
      // רשימה מפורטת - מחזיר פירוט
      const orders = await prisma.order.findMany({
        where: { status },
        include: {
          supplier: {
            select: { name: true },
          },
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      if (orders.length === 0) {
        const reply = `אין הזמנות בסטטוס "${status}"`;
        return res.status(200).json({ reply });
      }

      const ordersList = orders
        .map(
          (order) =>
            `• הזמנה ${order.orderNumber}: ${
              order.supplier?.name || "ללא ספק"
            } - ${Number(order.totalAmount).toLocaleString()} ${
              order.originalCurrency || "NIS"
            }`
        )
        .join("\n");

      const reply = `הזמנות בסטטוס "${status}":\n${ordersList}`;

      console.log(
        `✅ Orders list by status: ${orders.length} orders with status ${status}`
      );
      return res.status(200).json({ reply });
    }
  } catch (error: any) {
    console.error("❌ Error in orders by status:", error);
    return res.status(500).json({ error: "שגיאה בחיפוש הזמנות לפי סטטוס" });
  }
}
async function handleLicenseExpiry(question: string, res: NextApiResponse) {
  try {
    const monthRange = extractMonthRange(question);

    let whereCondition: any = {};

    if (monthRange) {
      whereCondition.licenseExpiry = {
        gte: monthRange.start,
        lte: monthRange.end,
      };
    } else {
      // ברירת מחדל - החודש הנוכחי
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      whereCondition.licenseExpiry = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const suppliers = await prisma.supplier.findMany({
      where: whereCondition,
      select: {
        name: true,
        licenseExpiry: true,
      },
    });

    if (suppliers.length === 0) {
      const reply = "אין ספקים עם רישיון שפג בתקופה המבוקשת";
      return res.status(200).json({ reply });
    }

    const list = suppliers
      .map(
        (s) =>
          `• ${s.name} (${
            s.licenseExpiry?.toLocaleDateString("he-IL") || "לא זמין"
          })`
      )
      .join("\n");

    const reply = `ספקים עם רישיון שפג תוקף:\n${list}`;

    console.log(`✅ License expiry result: ${suppliers.length} suppliers`);
    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error("❌ Error in license expiry:", error);
    return res.status(500).json({ error: "שגיאה בחיפוש רישיונות שפגו" });
  }
}

async function handleFinancialQuestion(question: string, res: NextApiResponse) {
  try {
    console.log(`🔍 Financial question received: "${question}"`);

    // חפש כל החודשים בשאלה (תמיכה בחודשים מרובים)
    const monthMatches = Array.from(
      question.matchAll(
        /(יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר|ינואר|פברואר|מרץ|אפריל|מאי|יוני)/gi
      )
    );
    const months = monthMatches.map((match) => match[1]);

    console.log(`🔍 Found months:`, months);

    if (months.length > 0) {
      let totalPayments = 0;
      let allPaymentDetails = [];
      let monthlyBreakdown = [];

      // עבור על כל חודש
      for (const monthName of months) {
        console.log(`🔍 Processing month: ${monthName}`);

        const monthNumber = getMonthNumber(monthName);
        if (!monthNumber) continue;

        const monthStart = new Date(2025, monthNumber - 1, 1);
        const monthEnd = new Date(2025, monthNumber, 0, 23, 59, 59);

        console.log(
          `🔍 Date range for ${monthName}: ${monthStart.toISOString()} - ${monthEnd.toISOString()}`
        );

        // חפש כל שלבי התשלום בחודש הזה (מקדמות + סופיים)
        const paymentPhases = await prisma.orderPhase.findMany({
          where: {
            AND: [
              {
                phaseName: {
                  in: ["תשלום מקדמה", "תשלום סופי"],
                },
              },
              {
                OR: [
                  {
                    startDate: {
                      gte: monthStart,
                      lte: monthEnd,
                    },
                  },
                  {
                    endDate: {
                      gte: monthStart,
                      lte: monthEnd,
                    },
                  },
                ],
              },
            ],
          },
          include: {
            order: {
              include: {
                supplier: true,
              },
            },
          },
        });

        console.log(
          `🔍 Found ${paymentPhases.length} payment phases in ${monthName}`
        );

        let monthlyTotal = 0;
        let monthlyDetails = [];

        for (const phase of paymentPhases) {
          const order = phase.order;
          const supplier = order.supplier;
          let paymentAmount = 0;

          if (phase.phaseName === "תשלום מקדמה") {
            // חישוב מקדמה
            if (supplier.hasAdvancePayment && supplier.advancePercentage) {
              paymentAmount =
                Number(order.totalAmount) * (supplier.advancePercentage / 100);
            }
          } else if (phase.phaseName === "תשלום סופי") {
            // חישוב תשלום סופי
            if (supplier.hasAdvancePayment && supplier.advancePercentage) {
              paymentAmount =
                Number(order.totalAmount) *
                ((100 - supplier.advancePercentage) / 100);
            } else {
              paymentAmount = Number(order.totalAmount);
            }
          }

          monthlyTotal += paymentAmount;

          const paymentDetail = {
            orderNumber: order.orderNumber,
            supplier: supplier.name,
            phaseType: phase.phaseName,
            amount: paymentAmount,
            date: phase.startDate?.toLocaleDateString("he-IL"),
            currency: order.originalCurrency || "NIS",
          };

          monthlyDetails.push(paymentDetail);
          allPaymentDetails.push({
            ...paymentDetail,
            month: monthName,
          });
        }

        monthlyBreakdown.push({
          month: monthName,
          total: monthlyTotal,
          count: paymentPhases.length,
          details: monthlyDetails,
        });

        totalPayments += monthlyTotal;

        console.log(
          `🔍 ${monthName} total: ${monthlyTotal.toLocaleString("he-IL")}`
        );
      }

      console.log(`🔍 All payment details:`, allPaymentDetails);

      if (totalPayments === 0) {
        const monthList = months.join(", ");
        const reply = `אין תשלומים מתוכננים ל${monthList}`;
        return res.status(200).json({ reply });
      }

      // בניית התשובה
      let reply = "";

      if (months.length === 1) {
        // חודש יחיד
        const monthData = monthlyBreakdown[0];
        if (monthData.details.length === 0) {
          reply = `אין תשלומים מתוכננים לחודש ${months[0]}`;
        } else {
          const detailsList = monthData.details
            .map(
              (p) =>
                `• ${p.orderNumber} (${p.supplier}) - ${p.phaseType}: ${Number(
                  p.amount
                ).toLocaleString("he-IL")} ${p.currency} בתאריך ${p.date}`
            )
            .join("\n");

          reply = `💰 תשלומים מתוכננים לחודש ${
            months[0]
          }:\n\n${detailsList}\n\n📊 סה"כ לתשלום: ${Number(
            totalPayments
          ).toLocaleString("he-IL")} ש"ח`;
        }
      } else {
        // חודשים מרובים
        reply = `💰 תשלומים מתוכננים (${months.join(", ")}):\n\n`;

        for (const monthData of monthlyBreakdown) {
          if (monthData.details.length > 0) {
            reply += `📅 ${monthData.month}:\n`;
            const detailsList = monthData.details
              .map(
                (p) =>
                  `  • ${p.orderNumber} (${p.supplier}) - ${
                    p.phaseType
                  }: ${Number(p.amount).toLocaleString("he-IL")} ${
                    p.currency
                  } בתאריך ${p.date}`
              )
              .join("\n");
            reply += `${detailsList}\n  📊 סיכום ${monthData.month}: ${Number(
              monthData.total
            ).toLocaleString("he-IL")} ש"ח\n\n`;
          } else {
            reply += `📅 ${monthData.month}: אין תשלומים\n\n`;
          }
        }

        reply += `🎯 סה"כ כל החודשים: ${Number(totalPayments).toLocaleString(
          "he-IL"
        )} ש"ח`;
      }

      console.log(
        `✅ Financial calculation for ${months.join(
          ", "
        )}: ${totalPayments.toLocaleString("he-IL")}`
      );
      return res.status(200).json({ reply });
    }

    // חישוב סכום כולל (ברירת מחדל)
    const totalAmount = await prisma.order.aggregate({
      _sum: { totalAmount: true },
    });

    const sum = totalAmount._sum.totalAmount || 0;
    const formattedSum = Number(sum).toLocaleString("he-IL");
    const reply = `הסכום הכולל של כל ההזמנות: ${formattedSum} ש"ח`;

    console.log(`✅ Total financial calculation: ${formattedSum}`);
    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error("❌ Error in financial calculation:", error);
    return res.status(500).json({ error: "שגיאה בחישוב כספי" });
  }
}

function getMonthNumber(monthName: string): number | null {
  const months: Record<string, number> = {
    ינואר: 1,
    פברואר: 2,
    מרץ: 3,
    אפריל: 4,
    מאי: 5,
    יוני: 6,
    יולי: 7,
    אוגוסט: 8,
    ספטמבר: 9,
    אוקטובר: 10,
    נובמבר: 11,
    דצמבר: 12,
  };

  return months[monthName.toLowerCase()] || null;
}

// === Main Handler Function ===

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

  try {
    // === לוגיקה מתוקנת עם דיבאג ברור ===

    // שלב 1: שאלות כספיות
    if (isFinancialQuestion(question)) {
      console.log("🎯 Detected: Financial question");
      return await handleFinancialQuestion(question, res);
    }

    // שלב 2: בדיקה אם זו שאלת ספירה כללית (בלי מדינה)
    const isGeneralCountQuestion =
      (question.includes("כמה ספקים יש לנו") ||
        question.includes("מספר ספקים") ||
        question.includes("how many suppliers do we have")) &&
      !hasCountryMention(question);

    if (isGeneralCountQuestion) {
      console.log("🎯 Detected: General supplier count question");
      return await handleGeneralSupplierCount(res);
    }

    // שלב 3: בדיקה אם זו שאלה על ספקים במדינה ספציפית
    const countries = await extractCountries(question);
    console.log(`🌍 Extracted countries: ${countries}`);

    if (countries.length > 0 && isCountQuestion(question)) {
      console.log(
        `🎯 Detected: Supplier count by country - ${countries.join(", ")}`
      );
      return await handleSupplierCountByCountry(countries, res);
    }

    // שלב 4: שאלות על הזמנות

    if (isOrderStatusQuestion(question)) {
      console.log("🎯 Detected: Order status question");
      return await handleOrdersByStatus(question, res);
    }
    if (isOrderCountQuestion(question)) {
      console.log("🎯 Detected: Order count question");
      return await handleOrderCount(question, res);
    }
    // שלב 5: שאלות על רישיונות
    if (isExpiryQuestion(question)) {
      console.log("🎯 Detected: License expiry question");
      return await handleLicenseExpiry(question, res);
    }

    // שלב 6: שאלות לא מזוהות
    console.log("❓ Question not recognized");
    return res.status(400).json({
      error:
        "לא הצלחתי להבין את השאלה. אני יכול לעזור עם שאלות על ספקים, הזמנות ורישיונות",
      debug: {
        question,
        isGeneralCount: isGeneralCountQuestion,
        countries: countries,
        isCountQ: isCountQuestion(question),
        isOrderQ: isOrderQuestion(question),
        isFinancialQ: isFinancialQuestion(question),
      },
    });
  } catch (error: any) {
    console.error("❌ Error in query-ai:", error);
    return res.status(500).json({
      error: "שגיאה כללית בשרת",
      details: error.message,
    });
  }
}
