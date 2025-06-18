import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * מחזיר עד 20 ספקים עבור מדינה נתונה (case-insensitive).
 */
export async function getSuppliersByCountry(country: string) {
  return prisma.supplier.findMany({
    where: {
      country: {
        equals: country,
        mode: "insensitive",
      },
    },
    take: 20,
  });
}
