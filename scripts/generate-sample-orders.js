// scripts/generate-sample-orders.js - Enhanced with Order Phases
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// רשימת סטטוסים אפשריים
const orderStatuses = [
  "בתהליך הזמנה",
  "הזמנה נשלחה",
  "אושר על ידי ספק",
  "בייצור",
  "נשלח",
  "במכס",
  "שוחרר ממכס",
  "בדרך אלינו",
  "הגיע למחסן",
  "הושלם",
];

// מטבעות עיקריים
const currencies = ["USD", "EUR", "CNY", "GBP"];

// מונה גלובלי להזמנות
let orderCounter = 1;

// פונקציה ליצירת מספר הזמנה
function generateOrderNumber() {
  const year = new Date().getFullYear();
  const paddedCounter = orderCounter.toString().padStart(3, "0");
  orderCounter++;
  return `ORD-${year}-${paddedCounter}`;
}

// פונקציה ליצירת תאריך רנדומלי
function getRandomDate(startDaysAgo, endDaysAgo) {
  const now = new Date();
  const start = new Date(now.getTime() - startDaysAgo * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() - endDaysAgo * 24 * 60 * 60 * 1000);
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// פונקציה ליצירת תאריך עתידי
function getFutureDate(minDays, maxDays) {
  const now = new Date();
  const days = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

// פונקציה ליצירת סכום רנדומלי
function getRandomAmount(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// פונקציה לבחירת אלמנט רנדומלי ממערך
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// פונקציה ליצירת תיאור הזמנה
function generateOrderDescription(supplierName) {
  const products = [
    "מזון יבש לכלבים",
    "מזון רטוב לחתולים",
    "חטיפים טבעיים לכלבים",
    "צעצועי לעיסה",
    "רצועות וקולרים",
    "כלובים ונשאים",
    "ציוד טיפוח",
    "מזון פרימיום לגורים",
    "ויטמינים ותוספי מזון",
  ];

  const selectedProducts = [];
  const numProducts = Math.floor(Math.random() * 3) + 1; // 1-3 מוצרים

  for (let i = 0; i < numProducts; i++) {
    const product = getRandomElement(products);
    if (!selectedProducts.includes(product)) {
      selectedProducts.push(product);
    }
  }

  return `הזמנה מ${supplierName}: ${selectedProducts.join(", ")}`;
}

// פונקציה ליצירת שלבים להזמנה
async function createOrderPhases(order, supplier, templates) {
  console.log(`    🔄 Creating phases for order: ${order.orderNumber}`);

  let currentDate = new Date(order.etaFinal);
  const phases = [];

  // חשב אחורה מהתאריך הסופי
  for (let i = templates.length - 1; i >= 0; i--) {
    const template = templates[i];

    // בדוק אם השלב תלוי בתנאי
    if (template.isConditional) {
      if (
        template.condition === "hasAdvancePayment" &&
        !supplier.hasAdvancePayment
      ) {
        console.log(
          `    ⏭️ Skipping conditional stage: ${template.name} (no advance payment)`
        );
        continue;
      }
    }

    // חשב משך השלב
    let stageDuration = template.durationDays;

    if (template.isDynamic && template.calculationMethod) {
      if (template.calculationMethod === "productionTimeWeeks * 7") {
        stageDuration = supplier.productionTimeWeeks * 7;
      } else if (template.calculationMethod === "shippingTimeWeeks * 7") {
        stageDuration = supplier.shippingTimeWeeks * 7;
      }
    }

    // חשב תאריכי השלב
    const endDate = new Date(currentDate);
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - stageDuration);

    phases.unshift({
      orderId: order.id,
      phaseName: template.name,
      startDate: startDate,
      endDate: endDate,
      durationDays: stageDuration,
      isActive: true,
      phaseOrder: template.order,
      templateId: template.id,
    });

    // עדכן תאריך נוכחי לשלב הקודם
    currentDate = new Date(startDate);

    console.log(
      `      ✅ ${template.name}: ${startDate.toLocaleDateString(
        "he-IL"
      )} - ${endDate.toLocaleDateString("he-IL")} (${stageDuration} days)`
    );
  }

  // צור את כל השלבים בבסיס הנתונים
  if (phases.length > 0) {
    await prisma.orderPhase.createMany({
      data: phases,
    });
    console.log(
      `    ✅ Created ${phases.length} phases for order ${order.orderNumber}`
    );
  }

  return phases.length;
}

async function generateSampleOrders() {
  try {
    console.log("🚀 Starting sample orders generation...\n");

    // קבל את כל התבניות ממוינות לפי סדר
    const templates = await prisma.orderStageTemplate.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    console.log(`📋 Found ${templates.length} stage templates`);
    if (templates.length === 0) {
      console.log(
        "❌ No stage templates found! Please add stage templates first."
      );
      return;
    }

    // קבל את כל הספקים
    const suppliers = await prisma.supplier.findMany();
    console.log(`📋 Found ${suppliers.length} suppliers`);

    if (suppliers.length === 0) {
      console.log("❌ No suppliers found! Please add suppliers first.");
      return;
    }

    // קבל עמילויות מכס (אם יש)
    const customsCompanies = await prisma.customsCompany.findMany({
      include: {
        agents: true,
      },
    });

    let totalOrdersCreated = 0;
    let totalPhasesCreated = 0;

    // יצור הזמנות לכל ספק
    for (const supplier of suppliers) {
      const numOrders = Math.floor(Math.random() * 2) + 2; // 2-3 הזמנות לספק
      console.log(
        `\n🏭 Creating ${numOrders} orders for supplier: ${supplier.name}`
      );

      for (let i = 0; i < numOrders; i++) {
        try {
          // בחר מטבע (ברירת מחדל מטבע הספק או רנדומלי)
          const currency = supplier.currency || getRandomElement(currencies);

          // חשב סכומים
          const totalAmount = getRandomAmount(10000, 150000);
          const hasAdvance = supplier.hasAdvancePayment || Math.random() > 0.5;
          const advancePercentage =
            supplier.advancePercentage ||
            (hasAdvance ? Math.floor(Math.random() * 30) + 20 : 0);
          const advanceAmount = hasAdvance
            ? Math.floor((totalAmount * advancePercentage) / 100)
            : null;
          const finalPaymentAmount = hasAdvance
            ? totalAmount - advanceAmount
            : totalAmount;

          // חשב שער חליפין
          let exchangeRate = 1;
          if (currency === "USD") exchangeRate = 3.6 + Math.random() * 0.4; // 3.6-4.0
          if (currency === "EUR") exchangeRate = 3.9 + Math.random() * 0.4; // 3.9-4.3
          if (currency === "CNY") exchangeRate = 0.5 + Math.random() * 0.1; // 0.5-0.6
          if (currency === "GBP") exchangeRate = 4.5 + Math.random() * 0.5; // 4.5-5.0

          // בחר סטטוס רנדומלי
          const status = getRandomElement(orderStatuses);

          // חשב תאריכים בהתאם לסטטוס
          let createdAt, etaFinal;
          if (
            ["בתהליך הזמנה", "הזמנה נשלחה", "אושר על ידי ספק"].includes(status)
          ) {
            createdAt = getRandomDate(30, 5); // נוצר לפני 5-30 יום
            etaFinal = getFutureDate(30, 180); // יגיע בעוד 30-90 יום
          } else if (["בייצור", "נשלח", "במכס"].includes(status)) {
            createdAt = getRandomDate(60, 20); // נוצר לפני 20-60 יום
            etaFinal = getFutureDate(10, 45); // יגיע בעוד 10-45 יום
          } else {
            createdAt = getRandomDate(90, 30); // נוצר לפני 30-90 יום
            etaFinal = getFutureDate(5, 30); // יגיע בעוד 5-30 יום או כבר הגיע
          }

          // בחר עמיל מכס (אם יש)
          let customsCompanyId = null;
          let customsAgentId = null;
          if (customsCompanies.length > 0 && Math.random() > 0.3) {
            // 70% סיכוי לעמיל מכס
            const customsCompany = getRandomElement(customsCompanies);
            customsCompanyId = customsCompany.id;
            if (customsCompany.agents.length > 0) {
              customsAgentId = getRandomElement(customsCompany.agents).id;
            }
          }

          // יצור מספר מכולה (אם נשלח)
          const containerNumber = [
            "נשלח",
            "במכס",
            "שוחרר ממכס",
            "בדרך אלינו",
            "הגיע למחסן",
            "הושלם",
          ].includes(status)
            ? `MSCU${Math.floor(Math.random() * 9000000) + 1000000}`
            : null;

          // חשב עלות שחרור נמל (אם רלוונטי)
          const portReleaseCost = containerNumber
            ? getRandomAmount(500, 3000)
            : null;

          // יצור הערות
          const notes = generateOrderDescription(supplier.name);

          // צור את ההזמנה
          const order = await prisma.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              supplierId: supplier.id,
              etaFinal: etaFinal,
              status: status,
              totalAmount: totalAmount,
              advanceAmount: advanceAmount,
              finalPaymentAmount: finalPaymentAmount,
              originalCurrency: currency,
              exchangeRate: Math.round(exchangeRate * 100) / 100, // עיגול ל-2 מקומות
              containerNumber: containerNumber,
              customsCompanyId: customsCompanyId,
              customsAgentId: customsAgentId,
              notes: notes,
              portReleaseCost: portReleaseCost,
              calculatedEta: etaFinal,
              createdAt: createdAt,
              updatedAt: createdAt,
            },
          });

          console.log(
            `  ✅ Created order ${
              order.orderNumber
            } - ${status} - ${totalAmount.toLocaleString()} ${currency}`
          );
          totalOrdersCreated++;

          // 🎯 יצור שלבים להזמנה החדשה
          const phasesCreated = await createOrderPhases(
            order,
            supplier,
            templates
          );
          totalPhasesCreated += phasesCreated;
        } catch (orderError) {
          console.error(
            `  ❌ Failed to create order for ${supplier.name}:`,
            orderError.message
          );
        }
      }
    }

    console.log(
      `\n🎉 Successfully created ${totalOrdersCreated} sample orders!`
    );
    console.log(`🎉 Successfully created ${totalPhasesCreated} order phases!`);

    // סיכום סופי
    console.log("\n📊 Final summary:");
    const orderCounts = {};
    for (const status of orderStatuses) {
      const count = await prisma.order.count({ where: { status } });
      if (count > 0) {
        orderCounts[status] = count;
      }
    }

    console.log("Orders by status:");
    Object.entries(orderCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    const totalOrders = await prisma.order.count();
    const totalValue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
    });

    console.log(`\nTotal orders: ${totalOrders}`);
    console.log(
      `Total value: ${totalValue._sum.totalAmount?.toLocaleString()} (mixed currencies)`
    );

    // סיכום שלבים
    const totalPhases = await prisma.orderPhase.count();
    const phasesByType = await prisma.orderPhase.groupBy({
      by: ["phaseName"],
      _count: { phaseName: true },
    });

    console.log(`\nTotal phases: ${totalPhases}`);
    console.log("Phases by type:");
    phasesByType.forEach((phase) => {
      console.log(`  ${phase.phaseName}: ${phase._count.phaseName}`);
    });
  } catch (error) {
    console.error("❌ Failed to generate sample orders:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// הרץ את יצירת ההזמנות
generateSampleOrders()
  .then(() => {
    console.log("\n✅ Sample orders and phases generation completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Sample orders generation failed:", error);
    process.exit(1);
  });
