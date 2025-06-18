// lib/parsers/getOrdersByStatus.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getOrdersByStatus(status?: string) {
  const whereClause: any = {};

  if (status) {
    if (status === "פתוח") {
      // כל הסטטוסים פתוחים (לא הושלם)
      whereClause.status = {
        not: "הושלם",
      };
    } else {
      whereClause.status = {
        equals: status,
        mode: "insensitive",
      };
    }
  }

  return prisma.order.findMany({
    where: whereClause,
    include: {
      supplier: {
        select: {
          name: true,
          country: true,
        },
      },
    },
    take: 20, // הגבל ל-20 הזמנות
    orderBy: {
      createdAt: "desc",
    },
  });
}
