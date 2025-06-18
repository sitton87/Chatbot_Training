// scripts/update-supplier-licenses.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// פונקציה ליצירת תאריך רנדומלי בין שני תאריכים
function getRandomDateBetween(startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime);
}

// פונקציה ליצירת מספר רישיון רנדומלי
function generateLicenseNumber(prefix = 'IL') {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 900000) + 100000; // 6 ספרות
  return `${prefix}-${year}-${randomNum}`;
}

async function updateSupplierLicenses() {
  try {
    console.log('🚀 Starting supplier licenses update...\n');

    // תאריכי התחלה וסיום
    const startDate = new Date('2025-05-01'); // 1/5/2025
    const endDate = new Date('2026-07-01');   // 1/7/2026

    console.log(`📅 License expiry range: ${startDate.toLocaleDateString('he-IL')} - ${endDate.toLocaleDateString('he-IL')}`);

    // קבל את כל הספקים
    const suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        name: true,
        country: true
      }
    });

    console.log(`📋 Found ${suppliers.length} suppliers to update\n`);

    if (suppliers.length === 0) {
      console.log('❌ No suppliers found!');
      return;
    }

    let updatedCount = 0;

    // עדכן כל ספק
    for (const supplier of suppliers) {
      try {
        // יצור מספרי רישיון
        const importLicense = generateLicenseNumber('IMP');
        const feedLicense = generateLicenseNumber('FEED');

        // יצור תאריכי תוקף רנדומליים
        const importExpiry = getRandomDateBetween(startDate, endDate);
        const feedExpiry = getRandomDateBetween(startDate, endDate);

        // עדכן את הספק
        await prisma.supplier.update({
          where: {
            id: supplier.id
          },
          data: {
            importLicense: importLicense,
            licenseExpiry: importExpiry,
            feedLicense: feedLicense,
            feedLicenseExpiry: feedExpiry
          }
        });

        console.log(`✅ Updated: ${supplier.name} (${supplier.country})`);
        console.log(`   רישיון ייבוא: ${importLicense} - תוקף עד: ${importExpiry.toLocaleDateString('he-IL')}`);
        console.log(`   רישיון מספוא: ${feedLicense} - תוקף עד: ${feedExpiry.toLocaleDateString('he-IL')}\n`);

        updatedCount++;

      } catch (supplierError) {
        console.error(`❌ Failed to update ${supplier.name}:`, supplierError.message);
      }
    }

    console.log(`🎉 Successfully updated ${updatedCount} suppliers!`);

    // סיכום סופי
    console.log('\n📊 License expiry distribution:');
    
    // חלק את התקופה ל-4 רבעונים ובדוק כמה רישיונות פגים בכל רבעון
    const quarters = [
      { name: 'Q2 2025', start: new Date('2025-05-01'), end: new Date('2025-07-31') },
      { name: 'Q3 2025', start: new Date('2025-08-01'), end: new Date('2025-10-31') },
      { name: 'Q4 2025', start: new Date('2025-11-01'), end: new Date('2026-01-31') },
      { name: 'Q1-Q2 2026', start: new Date('2026-02-01'), end: new Date('2026-07-01') }
    ];

    for (const quarter of quarters) {
      const importCount = await prisma.supplier.count({
        where: {
          licenseExpiry: {
            gte: quarter.start,
            lte: quarter.end
          }
        }
      });

      const feedCount = await prisma.supplier.count({
        where: {
          feedLicenseExpiry: {
            gte: quarter.start,
            lte: quarter.end
          }
        }
      });

      console.log(`${quarter.name}: ${importCount} רישיונות ייבוא, ${feedCount} רישיונות מספוא`);
    }

  } catch (error) {
    console.error('❌ Failed to update supplier licenses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// הרץ את העדכון
updateSupplierLicenses()
  .then(() => {
    console.log('\n✅ Supplier licenses update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Supplier licenses update failed:', error);
    process.exit(1);
  });