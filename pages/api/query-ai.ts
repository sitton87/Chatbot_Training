// pages/api/query-ai.ts - גרסה מתוקנת
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
    // === חדש: לוגיקה מתוקנת עם דיבאג ברור ===
    
    // שלב 1: בדיקה אם זו שאלת ספירה כללית (בלי מדינה)
    const isGeneralCountQuestion = 
      (question.includes("כמה ספקים יש לנו") || 
       question.includes("מספר ספקים") || 
       question.includes("how many suppliers do we have")) &&
      !hasCountryMention(question);
    
    if (isGeneralCountQuestion) {
      console.log("🎯 Detected: General supplier count question");
      return await handleGeneralSupplierCount(res);
    }

    // שלב 2: בדיקה אם זו שאלה על ספקים במדינה ספציפית
    const countries = await extractCountries(question);
    console.log(`🌍 Extracted countries: ${countries}`);
    
    if (countries.length > 0 && isCountQuestion(question)) {
      console.log(`🎯 Detected: Supplier count by country - ${countries.join(', ')}`);
      return await handleSupplierCountByCountry(countries, res);
    }

    // שלב 3: שאלות על הזמנות
    if (isOrderCountQuestion(question)) {
      console.log("🎯 Detected: Order count question");
      return await handleOrderCount(question, res);
    }

    if (isOrderStatusQuestion(question)) {
      console.log("🎯 Detected: Order status question");
      return await handleOrdersByStatus(question, res);
    }

    // שלב 4: שאלות על רישיונות
    if (isExpiryQuestion(question)) {
      console.log("🎯 Detected: License expiry question");
      return await handleLicenseExpiry(question, res);
    }

    // שלב 5: שאלות לא מזוהות
    console.log("❓ Question not recognized");
    return res.status(400).json({ 
      error: "לא הצלחתי להבין את השאלה. אני יכול לעזור עם שאלות על ספקים, הזמנות ורישיונות",
      debug: {
        question,
        isGeneralCount: isGeneralCountQuestion,
        countries: countries,
        isCountQ: isCountQuestion(question),
        isOrderQ: isOrderQuestion(question)
      }
    });

  } catch (error: any) {
    console.error("❌ Error in query-ai:", error);
    return res.status(500).json({ 
      error: "שגיאה כללית בשרת",
      details: error.message 
    });
  }
}

// === פונקציות עזר ===

function hasCountryMention(question: string): boolean {
  const countryKeywords = [
    'בסין', 'מסין', 'china',
    'בגרמניה', 'מגרמניה', 'germany', 
    'ברוסיה', 'מרוסיה', 'russia',
    'בספרד', 'מספרד', 'spain',
    'בארהב', 'בארה"ב', 'usa', 'america',
    'באיטליה', 'מאיטליה', 'italy'
  ];
  
  return countryKeywords.some(keyword => 
    question.toLowerCase().includes(keyword.toLowerCase())
  );
}

// === Handlers מתוקנים ===

async function handleGeneralSupplierCount(res: NextApiResponse) {
  try {
    const totalSuppliers = await prisma.supplier.count();
    const activeSuppliers = await prisma.supplier.count({
      where: { isActive: true }
    });

    const reply = activeSuppliers < totalSuppliers 
      ? `יש לנו סה"כ ${totalSuppliers} ספקים במערכת, מתוכם ${activeSuppliers} פעילים`
      : `יש לנו סה"כ ${totalSuppliers} ספקים במערכת`;

    console.log(`✅ General count result: ${totalSuppliers} total, ${activeSuppliers} active`);
    return res.status(200).json({ reply });

  } catch (error: any) {
    console.error("❌ Error in general supplier count:", error);
    return res.status(500).json({ error: "שגיאה בספירת ספקים" });
  }
}

async function handleSupplierCountByCountry(countries: string[], res: NextApiResponse) {
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

      const reply = count === 0 
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

      const resultLines = results.map(r => `${r.country}: ${r.count} ספקים`);
      const totalCount = results.reduce((sum, r) => sum + r.count, 0);
      
      const reply = `הנה הספירה לפי מדינות:\n• ${resultLines.join('\n• ')}\n\nסה"כ: ${totalCount} ספקים`;

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

    const orders = await prisma.order.findMany({
      where: { status },
      include: {
        supplier: {
          select: { name: true }
        }
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    if (orders.length === 0) {
      const reply = `אין הזמנות בסטטוס "${status}"`;
      return res.status(200).json({ reply });
    }

    const ordersList = orders.map(order => 
      `• הזמנה ${order.orderNumber}: ${order.supplier?.name || 'ללא ספק'} - ${Number(order.totalAmount).toLocaleString()} ${order.originalCurrency || 'NIS'}`
    ).join('\n');

    const reply = `הזמנות בסטטוס "${status}":\n${ordersList}`;
    
    console.log(`✅ Orders by status result: ${orders.length} orders with status ${status}`);
    return res.status(200).json({ reply });

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
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
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

    const list = suppliers.map(s => 
      `• ${s.name} (${s.licenseExpiry?.toLocaleDateString('he-IL') || 'לא זמין'})`
    ).join('\n');
    
    const reply = `ספקים עם רישיון שפג תוקף:\n${list}`;
    
    console.log(`✅ License expiry result: ${suppliers.length} suppliers`);
    return res.status(200).json({ reply });

  } catch (error: any) {
    console.error("❌ Error in license expiry:", error);
    return res.status(500).json({ error: "שגיאה בחיפוש רישיונות שפגו" });
  }
}