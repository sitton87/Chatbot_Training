// scripts/copy-all-data.js
const { PrismaClient } = require('@prisma/client');

// מסד הנתונים המקורי
const sourceDB = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://pet_orders_owner:npg_AxVlt31pUPNX@ep-steep-bread-a2f5rtq6-pooler.eu-central-1.aws.neon.tech/pet_orders?sslmode=require'
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

    // שלב 1: העתק קטגוריות מוצרים (בסיס לטבלאות אחרות)
    console.log('📂 Copying product categories...');
    try {
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
    } catch (error) {
      console.log('⚠️ Product categories might not exist:', error.message);
    }

    // שלב 2: העתק עמילויות מכס
    console.log('🏢 Copying customs companies...');
    try {
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
    } catch (error) {
      console.log('⚠️ Customs companies might not exist:', error.message);
    }

    // שלב 3: העתק עמילי מכס (תלוי בעמילויות מכס)
    console.log('👤 Copying customs agents...');
    try {
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
    } catch (error) {
      console.log('⚠️ Customs agents might not exist:', error.message);
    }

    // שלב 4: העתק ספקים
    console.log('🏭 Copying suppliers...');
    try {
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
    } catch (error) {
      console.log('⚠️ Suppliers might not exist:', error.message);
    }

    // שלב 5: העתק קישורי ספק-קטגוריה (תלוי בספקים וקטגוריות)
    console.log('🔗 Copying supplier categories...');
    try {
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
    } catch (error) {
      console.log('⚠️ Supplier categories might not exist:', error.message);
    }

    // שלב 6: העתק הזמנות (תלוי בספקים ועמילויות)
    console.log('📦 Copying orders...');
    try {
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
    } catch (error) {
      console.log('⚠️ Orders might not exist:', error.message);
    }

    // שלב 7: העתק קטגוריות הזמנה (תלוי בהזמנות וקטגוריות)
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
      console.log('⚠️ Order categories might not exist:', error.message);
    }

    // שלב 8: העתק שלבי הזמנה (תלוי בהזמנות)
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
      console.log('⚠️ Order phases might not exist:', error.message);
    }

    // שלב 9: העתק תבניות שלבים
    console.log('📋 Copying order stage templates...');
    try {
      const orderStageTemplates = await sourceDB.orderStageTemplate.findMany();
      if (orderStageTemplates.length > 0) {
        await targetDB.orderStageTemplate.createMany({
          data: orderStageTemplates,
          skipDuplicates: true
        });
        console.log(`✅ Copied ${orderStageTemplates.length} order stage templates`);
      } else {
        console.log('ℹ️ No order stage templates found');
      }
    } catch (error) {
      console.log('⚠️ Order stage templates might not exist:', error.message);
    }

    // שלב 10: העתק היסטוריית סטטוס הזמנות
    console.log('📊 Copying order status history...');
    try {
      const orderStatusHistory = await sourceDB.orderStatusHistory.findMany();
      if (orderStatusHistory.length > 0) {
        await targetDB.orderStatusHistory.createMany({
          data: orderStatusHistory,
          skipDuplicates: true
        });
        console.log(`✅ Copied ${orderStatusHistory.length} order status history records`);
      } else {
        console.log('ℹ️ No order status history found');
      }
    } catch (error) {
      console.log('⚠️ Order status history might not exist:', error.message);
    }

    // שלב 11: העתק הגדרות מערכת
    console.log('⚙️ Copying system settings...');
    try {
      const systemSettings = await sourceDB.systemSetting.findMany();
      if (systemSettings.length > 0) {
        await targetDB.systemSetting.createMany({
          data: systemSettings,
          skipDuplicates: true
        });
        console.log(`✅ Copied ${systemSettings.length} system settings`);
      } else {
        console.log('ℹ️ No system settings found');
      }
    } catch (error) {
      console.log('⚠️ System settings might not exist:', error.message);
    }

    console.log('\n🎉 Data migration completed successfully!');
    
    // סיכום סופי
    console.log('\n📊 Final counts in target database:');
    try {
      const finalCounts = {
        suppliers: await targetDB.supplier.count(),
        orders: await targetDB.order.count(),
        categories: await targetDB.productCategory.count(),
        customsCompanies: await targetDB.customsCompany.count(),
        customsAgents: await targetDB.customsAgent.count(),
        supplierCategories: await targetDB.supplierCategory.count(),
      };
      
      Object.entries(finalCounts).forEach(([table, count]) => {
        console.log(`   ${table}: ${count}`);
      });
    } catch (error) {
      console.log('⚠️ Error getting final counts:', error.message);
    }

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