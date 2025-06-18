// handlers/licenseHandler.ts
import { PrismaClient } from "@prisma/client";
import { extractMonthRange } from "@/lib/parsers/extractMonthRange";
import type { QuestionContext } from "@/utils/questionRouter";

const prisma = new PrismaClient();

export async function handleLicenseQuestion(
  question: string,
  context: QuestionContext
): Promise<string> {
  try {
    console.log("📋 Handling license question");

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

    if (expiringSuppliers.length === 0) {
      return isHebrew
        ? "אין ספקים שתוקף רישיון הייבוא שלהם מסתיים בתקופה זו."
        : "No suppliers have their import license expiring in this period.";
    }

    const list = expiringSuppliers
      .map(
        (s) =>
          `- ${s.name} (${
            s.country
          }) - תוקף עד: ${s.licenseExpiry?.toLocaleDateString("he-IL")}`
      )
      .join("\n");

    return isHebrew
      ? `נמצאו ${expiringSuppliers.length} ספקים שתוקף רישיון הייבוא שלהם מסתיים:\n${list}`
      : `Found ${expiringSuppliers.length} suppliers whose import license expires:\n${list}`;
  } catch (error) {
    console.error("❌ Error in license handler:", error);
    throw new Error("שגיאה בבדיקת תוקף רישיונות");
  } finally {
    await prisma.$disconnect();
  }
}
