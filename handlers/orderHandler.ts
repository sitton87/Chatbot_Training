// handlers/orderHandler.ts
import { PrismaClient } from "@prisma/client";
import { isOrderCountQuestion } from "@/lib/parsers/isOrderCountQuestion";
import { isOrderStatusQuestion } from "@/lib/parsers/isOrderStatusQuestion";
import { isFinancialQuestion } from "@/lib/parsers/isFinancialQuestion";
import { extractOrderNumber } from "@/lib/parsers/extractOrderNumber";
import { extractOrderStatus } from "@/lib/parsers/extractOrderStatus";
import { getOrdersByStatus } from "@/lib/parsers/getOrdersByStatus";
import { getOrderByNumber } from "@/lib/parsers/getOrderByNumber";
import type { QuestionContext } from "@/utils/questionRouter";

const prisma = new PrismaClient();

export async function handleOrderQuestion(
  question: string,
  context: QuestionContext
): Promise<string> {
  try {
    console.log("📦 Handling order question");

    // שאלת סטטוס הזמנה ספציפית
    if (isOrderStatusQuestion(question)) {
      const orderNumber = extractOrderNumber(question);

      if (orderNumber) {
        return await handleSpecificOrderStatus(orderNumber);
      }
    }

    // שאלת ספירת הזמנות
    if (isOrderCountQuestion(question)) {
      return await handleOrderCount(question);
    }

    // שאלות כספיות על הזמנות
    if (isFinancialQuestion(question)) {
      return await handleOrderFinancials();
    }

    // שאלות על הזמנות לפי סטטוס
    const status = extractOrderStatus(question);
    if (status) {
      return await handleOrdersByStatus(status);
    }

    // שאלה כללית על הזמנות - הראה אחרונות
    return await handleGeneralOrderQuery();
  } catch (error) {
    console.error("❌ Error in order handler:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function handleSpecificOrderStatus(orderNumber: string): Promise<string> {
  const order = await getOrderByNumber(orderNumber);

  if (!order) {
    return `לא נמצאה הזמנה עם מספר ${orderNumber}`;
  }

  return `הזמנה ${order.orderNumber}:
ספק: ${order.supplier.name} (${order.supplier.country})
סטטוס: ${order.status}
סכום: ${order.totalAmount.toString()} ${order.originalCurrency || "N/A"}
תאריך משלוח צפוי: ${order.etaFinal.toLocaleDateString("he-IL")}
${order.containerNumber ? `מכולה: ${order.containerNumber}` : ""}
${order.notes ? `הערות: ${order.notes}` : ""}`;
}

async function handleOrderCount(question: string): Promise<string> {
  // זיהוי סטטוס (אופציונלי)
  const status = extractOrderStatus(question);
  console.log("🔍 Extracted status:", status);

  if (status) {
    if (status === "פתוח") {
      const count = await prisma.order.count({
        where: {
          status: {
            not: "הושלם",
          },
        },
      });
      return `יש לנו ${count} הזמנות פתוחות (שלא הושלמו)`;
    } else {
      const count = await prisma.order.count({
        where: {
          status: {
            equals: status,
            mode: "insensitive",
          },
        },
      });
      return `יש לנו ${count} הזמנות בסטטוס "${status}"`;
    }
  } else {
    // ספירה כללית
    const totalCount = await prisma.order.count();
    const openCount = await prisma.order.count({
      where: {
        status: { not: "הושלם" },
      },
    });
    return `יש לנו סה"כ ${totalCount} הזמנות, מתוכן ${openCount} פתוחות`;
  }
}

async function handleOrderFinancials(): Promise<string> {
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

  return `סיכום כספי של הזמנות:

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
}

async function handleOrdersByStatus(status: string): Promise<string> {
  const orders = await getOrdersByStatus(status);
  console.log(`📋 Found ${orders.length} orders with status: ${status}`);

  if (orders.length === 0) {
    return `לא נמצאו הזמנות בסטטוס "${status}"`;
  }

  let reply = `נמצאו ${orders.length} הזמנות בסטטוס "${status}":\n\n`;
  orders.forEach((order) => {
    reply += `${order.orderNumber} - ${order.supplier.name} (${order.supplier.country})\n`;
    reply += `   סכום: ${order.totalAmount.toString()} ${
      order.originalCurrency || "N/A"
    }\n`;
    reply += `   תאריך משלוח: ${order.etaFinal.toLocaleDateString(
      "he-IL"
    )}\n\n`;
  });

  return reply;
}

async function handleGeneralOrderQuery(): Promise<string> {
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
      order.originalCurrency || "N/A"
    }\n\n`;
  });

  return reply;
}
