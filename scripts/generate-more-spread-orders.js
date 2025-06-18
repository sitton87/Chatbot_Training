// קובץ חדש: scripts/generate-more-spread-orders.js
// יוצר הזמנות עם פיזור טוב יותר של תאריכים

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let orderCounter = 70; // התחל מאחרי ההזמנות הקיימות

function generateOrderNumber() {
  const year = new Date().getFullYear();
  const paddedCounter = orderCounter.toString().padStart(3, '0');
  orderCounter++;
  return `ORD-${year}-${paddedCounter}`;
}

// פונקציה ליצירת תאריכים מפוזרים יותר
function getSpreadFutureDate(minMonths, maxMonths) {
  const now = new Date();
  const months = Math.floor(Math.random() * (maxMonths - minMonths + 1)) + minMonths;
  const futureDate = new Date(now);
  futureDate.setMonth(futureDate.getMonth() + months);
  
  // וודא שהתאריך בטווח 2025
  if (futureDate.getFullYear() > 2025) {
    futureDate.setFullYear(2025);
    futureDate.setMonth(11); // דצמבר
  }
  
  return futureDate;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomAmount(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function createOrderPhases(order, supplier, templates) {
  console.log(`    🔄 Creating phases for order: ${order.orderNumber}`);
  
  let currentDate = new Date(order.etaFinal);
  const phases = [];

  for (let i = templates.length - 1; i >= 0; i--) {
    const template = templates[i];
    
    if (template.isConditional) {
      if (template.condition === 'hasAdvancePayment' && !supplier.hasAdvancePayment) {
        continue;
      }
    }

    let stageDuration = template.durationDays;
    
    if (template.isDynamic && template.calculationMethod) {
      if (template.calculationMethod === 'productionTimeWeeks * 7') {
        stageDuration = supplier.productionTimeWeeks * 7;
      } else if (template.calculationMethod === 'shippingTimeWeeks * 7') {
        stageDuration = supplier.shippingTimeWeeks * 7;
      }
    }

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
      templateId: template.id
    });

    currentDate = new Date(startDate);
  }

  if (phases.length > 0) {
    await prisma.orderPhase.createMany({
      data: phases
    });
    console.log(`    ✅ Created ${phases.length} phases for order ${order.orderNumber}`);
  }
  
  return phases.length;
}

async function generateSpreadOrders() {
  try {
    console.log('🚀 Creating more orders with better date spread...\n');

    const templates = await prisma.orderStageTemplate.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });

    const suppliers = await prisma.supplier.findMany();
    console.log(`📋 Found ${suppliers.length} suppliers`);

    const currencies = ['USD', 'EUR', 'CNY'];
    const statuses = ['בייצור', 'נשלח', 'במכס', 'הושלם'];

    let totalOrdersCreated = 0;
    let totalPhasesCreated = 0;

    // יצור 15 הזמנות נוספות עם פיזור טוב יותר
    for (let i = 0; i < 15; i++) {
      const supplier = getRandomElement(suppliers);
      const currency = supplier.currency || getRandomElement(currencies);
      const totalAmount = getRandomAmount(20000, 200000);
      
      // הבטח פיזור טוב של תאריכים
      let etaFinal;
      if (i < 3) {
        // 3 הזמנות לאוגוסט
        etaFinal = new Date(2025, 7, Math.floor(Math.random() * 28) + 1); // אוגוסט
      } else if (i < 6) {
        // 3 הזמנות לספטמבר
        etaFinal = new Date(2025, 8, Math.floor(Math.random() * 28) + 1); // ספטמבר
      } else if (i < 9) {
        // 3 הזמנות לאוקטובר
        etaFinal = new Date(2025, 9, Math.floor(Math.random() * 28) + 1); // אוקטובר
      } else if (i < 12) {
        // 3 הזמנות לנובמבר
        etaFinal = new Date(2025, 10, Math.floor(Math.random() * 28) + 1); // נובמבר
      } else {
        // 3 הזמנות לדצמבר
        etaFinal = new Date(2025, 11, Math.floor(Math.random() * 28) + 1); // דצמבר
      }

      const hasAdvance = supplier.hasAdvancePayment || Math.random() > 0.4;
      const advancePercentage = supplier.advancePercentage || (hasAdvance ? Math.floor(Math.random() * 30) + 20 : 0);
      const advanceAmount = hasAdvance ? Math.floor(totalAmount * advancePercentage / 100) : null;
      const finalPaymentAmount = hasAdvance ? totalAmount - advanceAmount : totalAmount;

      let exchangeRate = 1;
      if (currency === 'USD') exchangeRate = 3.7 + Math.random() * 0.2;
      if (currency === 'EUR') exchangeRate = 4.0 + Math.random() * 0.2;
      if (currency === 'CNY') exchangeRate = 0.52 + Math.random() * 0.05;

      const order = await prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          supplierId: supplier.id,
          etaFinal: etaFinal,
          status: getRandomElement(statuses),
          totalAmount: totalAmount,
          advanceAmount: advanceAmount,
          finalPaymentAmount: finalPaymentAmount,
          originalCurrency: currency,
          exchangeRate: Math.round(exchangeRate * 100) / 100,
          notes: `הזמנה נוספת מ${supplier.name}`,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 0-30 יום אחורה
          updatedAt: new Date()
        }
      });

      console.log(`✅ Created order ${order.orderNumber} - ETA: ${etaFinal.toLocaleDateString('he-IL')} - ${totalAmount.toLocaleString()} ${currency}`);
      totalOrdersCreated++;

      const phasesCreated = await createOrderPhases(order, supplier, templates);
      totalPhasesCreated += phasesCreated;
    }

    console.log(`\n🎉 Created ${totalOrdersCreated} additional orders!`);
    console.log(`🎉 Created ${totalPhasesCreated} additional phases!`);

    // סיכום תשלומים לפי חודשים
    console.log('\n📊 Payment summary by month:');
    
    const monthNames = [
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    
    for (let month = 7; month <= 12; month++) {
      const monthStart = new Date(2025, month - 1, 1);
      const monthEnd = new Date(2025, month, 0, 23, 59, 59);
      
      const paymentPhases = await prisma.orderPhase.count({
        where: {
          AND: [
            {
              phaseName: {
                in: ["תשלום מקדמה", "תשלום סופי"]
              }
            },
            {
              startDate: {
                gte: monthStart,
                lte: monthEnd,
              }
            }
          ]
        }
      });
      
      console.log(`${monthNames[month - 7]}: ${paymentPhases} תשלומים`);
    }

  } catch (error) {
    console.error('❌ Failed to generate spread orders:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generateSpreadOrders()
  .then(() => {
    console.log('\n✅ Spread orders generation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Spread orders generation failed:', error);
    process.exit(1);
  });