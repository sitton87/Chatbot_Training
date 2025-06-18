// lib/parsers/getOrderByNumber.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getOrderByNumber(orderNumber: string) {
  return prisma.order.findUnique({
    where: {
      orderNumber: orderNumber,
    },
    include: {
      supplier: {
        select: {
          name: true,
          country: true,
          city: true,
        },
      },
      customsCompany: {
        select: {
          name: true,
        },
      },
      customsAgent: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  });
}
