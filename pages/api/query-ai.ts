import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

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

  try {
    // שאלה פשוטה לבדיקה
    if (question.includes("ספקים")) {
      const count = await prisma.supplier.count();
      return res.status(200).json({ reply: `יש לנו ${count} ספקים במערכת` });
    }

    if (question.includes("הזמנות")) {
      const count = await prisma.order.count();
      return res.status(200).json({ reply: `יש לנו ${count} הזמנות במערכת` });
    }

    return res
      .status(200)
      .json({ reply: "שלום! אני לולי. שאל אותי על ספקים או הזמנות!" });
  } catch (error: any) {
    console.error("Error:", error);
    return res.status(500).json({ error: "שגיאה בשרת" });
  }
}
