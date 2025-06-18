// handlers/supplierHandler.ts
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { formatCountReply } from "@/lib/parsers/formatCountReply";
import { getSuppliersByCountry } from "@/lib/parsers/getSuppliersByCountry";
import type { QuestionContext } from "@/utils/questionRouter";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handleSupplierQuestion(
  question: string,
  context: QuestionContext
): Promise<string> {
  try {
    console.log("🏭 Handling supplier question");

    // שאלות כלליות על ספקים (בלי מדינה)
    if (context.isCountQuery && !context.hasCountryContext) {
      return await handleGeneralSupplierCount();
    }

    // שאלות ספירה לפי מדינות
    if (context.isCountQuery && context.hasCountryContext) {
      return await handleSupplierCountByCountries(question, context.countries);
    }

    // שאלות רשימה לפי מדינה
    if (context.hasCountryContext) {
      return await handleSupplierListByCountry(question, context.countries[0]);
    }

    throw new Error("שאלה על ספקים לא מובנת");
  } catch (error) {
    console.error("❌ Error in supplier handler:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function handleGeneralSupplierCount(): Promise<string> {
  const totalSuppliers = await prisma.supplier.count();
  const activeSuppliers = await prisma.supplier.count({
    where: { isActive: true },
  });

  console.log(
    `📊 Total suppliers: ${totalSuppliers}, Active: ${activeSuppliers}`
  );

  return `יש לנו סה"כ ${totalSuppliers} ספקים במערכת${
    activeSuppliers < totalSuppliers ? `, מתוכם ${activeSuppliers} פעילים` : ""
  }`;
}

async function handleSupplierCountByCountries(
  question: string,
  countries: string[]
): Promise<string> {
  if (countries.length > 1) {
    // מספר מדינות
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

    return reply;
  } else {
    // מדינה אחת
    const count = await prisma.supplier.count({
      where: {
        country: {
          equals: countries[0],
          mode: "insensitive",
        },
      },
    });

    console.log(`📊 Count result for ${countries[0]}:`, count);
    return formatCountReply(question, countries[0], count);
  }
}

async function handleSupplierListByCountry(
  question: string,
  country: string
): Promise<string> {
  const suppliers = await getSuppliersByCountry(country);
  console.log(`📋 Found ${suppliers.length} suppliers in ${country}`);

  if (suppliers.length === 0) {
    return `אין ספקים במדינה ${country} במסד הנתונים.`;
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

    return (
      chatResponse.choices[0]?.message?.content ||
      `נמצאו ${suppliers.length} ספקים במדינה ${country}`
    );
  } catch (openaiError) {
    console.error("❌ OpenAI error:", openaiError);
    // fallback בלי OpenAI
    const supplierNames = suppliers.map((s) => s.name).join(", ");
    return `נמצאו ${suppliers.length} ספקים במדינה ${country}: ${supplierNames}`;
  }
}
