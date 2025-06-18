// scripts/copy-all-data.ts
import { PrismaClient } from '@prisma/client';

// מסד הנתונים המקורי - תחליף את ה-URL
const sourceDB = new PrismaClient({
  datasources: {
    db: {
      url:'postgresql://pet_orders_owner:npg_AxVlt31pUPNX@ep-steep-bread-a2f5rtq6-pooler.eu-central-1.aws.neon.tech/pet_orders?sslmode=require' // postgresql://neondb_owner:npg_dEO6kSU7XGph@ep-dawn-bush-a2f8egeu-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
    }
  }
});

// מסד הנתונים החדש - יקח מה-.env
const targetDB = new PrismaClient();

async function copyAllData() {
  try {
    console.log('🚀 Starting complete data migration...\n');

    // בדיקת חיבור
    console.log('🔗 Testing connections...');
    await sourceDB.$connect();
    await targetDB.$connect();
    console.log('✅ Both databases connected successfully\n');

    // 1. העתק קטגוריות מוצרים
    console.log('📂 Copying product categories...');
    const categories = await sourceDB.productCategory.findMany();
    if (categories.length > 0) {
      await targetDB.productCategory.createMany({
        data: categories,
        skipDuplicates: true
      });
      console.log(`✅ Copied ${categories.length} product categories`);
    } else {
      console.log('ℹ️ No product categories found');
    }

    // 2. העתק עמילויות מכס
    console.log('🏢 Copying customs companies...');
    const customsCompanies = await sourceDB.customsCompany.findMany();
    if (customsCompanies.length > 0) {
      await targetDB.customsCompany.createMany({
        data: customsCompanies,
        skipDuplicates: true
      });
      console.log(`✅ Copied ${customsCompanies.length} customs companies`);
    } else {
      console.log('ℹ️ No customs companies found');
    }

    // 3. העתק עמילי מכס
    console.log('👤 Copying customs agents...');
    const customsAgents = await sourceDB.customsAgent.findMany();
    if (customsAgents.length > 0) {
      await targetDB.customsAgent.createMany({
        data: customsAgents,
        skipDuplicates: true
      });
      console.log(`✅ Copied ${customsAgents.length} customs agents`);
    } else {
      console.log('ℹ️ No customs agents found');
    }

    // 4. העתק ספקים
    console.log('🏭 Copying suppliers...');
    const suppliers = await sourceDB.supplier.findMany();
    if (suppliers.length > 0) {
      await targetDB.supplier.createMany({
        data: suppliers,
        skipDuplicates: true
      });
      console.log(`✅ Copied ${suppliers.length} suppliers`);
    } else {
      console.log('ℹ️ No suppliers found');
    }

    // 5. העתק קישורי ספק-קטגוריה
    console.log('🔗 Copying supplier categories...');
    const supplierCategories = await sourceDB.supplierCategory.findMany();
    if (supplierCategories.length > 0) {
      await targetDB.supplierCategory.createMany({
        data: supplierCategories,
        skipDuplicates: true
      });
      console.log(`✅ Copied ${supplierCategories.length} supplier-category links`);
    } else {
      console.log('ℹ️ No supplier categories found');
    }

    // 6. העתק משתמשים (אם יש)
    console.log('👥 Copying users...');
    try {
      const users = await sourceDB.user.findMany();
      if (users.length > 0) {
        await targetDB.user.createMany({
          data: users,
          skipDuplicates: true
        });
        console.log(`✅ Copied ${users.length} users`);
      } else {
        console.log('ℹ️ No users found');
      }
    } catch (error) {
      console.log('⚠️ Users table might not exist or have data');
    }

    // 7. העתק הזמנות
    console.log('📦 Copying orders...');
    const orders = await sourceDB.order.findMany();
    if (orders.length > 0) {
      await targetDB.order.createMany({
        data: orders,
        skipDuplicates: true
      });
      console.log(`✅ Copied ${orders.length} orders`);
    } else {
      console.log('ℹ️ No orders found');
    }

    // 8. העתק קטגוריות הזמנה
    console.log('🏷️ Copying order categories...');
    try {
      const orderCategories = await sourceDB.orderCategory.findMany();
      if (orderCategories.length > 0) {
        await targetDB.orderCategory.createMany({
          data: orderCategories,
          skipDuplicates: true
        });
        console.log(`✅ Copied ${orderCategories.length} order categories`);
      } else {
        console.log('ℹ️ No order categories found');
      }
    } catch (error) {
      console.log('⚠️ Order categories might not exist');
    }

    // 9. העתק שלבי הזמנה
    console.log('⏱️ Copying order phases...');
    try {
      const orderPhases = await sourceDB.orderPhase.findMany();
      if (orderPhases.length > 0) {
        await targetDB.orderPhase.createMany({
          data: orderPhases,
          skipDuplicates: true
        });
        console.log(`✅ Copied ${orderPhases.length} order phases`);
      } else {
        console.log('ℹ️ No order phases found');
      }
    } catch (error) {
      console.log('⚠️ Order phases might not exist');
    }

    // 10. העתק קבצים (מטאדאטה בלבד)
    console.log('📁 Copying file metadata...');
    try {
      const supplierFiles = await sourceDB.supplierFile.findMany();
      const orderFiles = await sourceDB.orderFile.findMany();
      
      if (supplierFiles.length > 0) {
        await targetDB.supplierFile.createMany({
          data: supplierFiles,
          skipDuplicates: true
        });
        console.log(`✅ Copied ${supplierFiles.length} supplier file records`);
      }
      
      if (orderFiles.length > 0) {
        await targetDB.orderFile.createMany({
          data: orderFiles,
          skipDuplicates: true
        });
        console.log(`✅ Copied ${orderFiles.length} order file records`);
      }
    } catch (error) {
      console.log('⚠️ File tables might not exist');
    }

    console.log('\n🎉 Data migration completed successfully!');
    
    // סיכום סופי
    console.log('\n📊 Final counts in target database:');
    const finalCounts = {
      suppliers: await targetDB.supplier.count(),
      orders: await targetDB.order.count(),
      categories: await targetDB.productCategory.count(),
      customsCompanies: await targetDB.customsCompany.count(),
    };
    
    Object.entries(finalCounts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sourceDB.$disconnect();
    await targetDB.$disconnect();
  }
}

// הרץ את ההעתקה
copyAllData()
  .then(() => {
    console.log('\n✅ All done! You can now test your chatbot with the copied data.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });