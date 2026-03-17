import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { 
  User, 
  Company, 
  IncomeTransaction, 
  ExpenseTransaction, 
  BalanceSheetEntry, 
  Budget, 
  FinancialTarget 
} from '../src/models';
import { config } from '../src/config';

const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

async function seed() {
  try {
    console.log('🌱 Starting seeding process...');
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      IncomeTransaction.deleteMany({}),
      ExpenseTransaction.deleteMany({}),
      BalanceSheetEntry.deleteMany({}),
      Budget.deleteMany({}),
      FinancialTarget.deleteMany({}),
    ]);
    console.log('Cleared existing collections');

    // 1. Create Company
    const company = await Company.create({
      name: 'Sahay & Associates CA Firm',
      gstin: '07AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      address: 'Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      financialYearStart: 4,
    });
    console.log('Company created');

    // 2. Create Users
    const hashedPassword = await bcrypt.hash('Demo@1234', 10);
    const users = await User.insertMany([
      { name: 'Super Admin', email: 'admin@finledger.com', password: hashedPassword, role: 'super_admin', companyId: company._id },
      { name: 'Arjun Sahay (CA)', email: 'ca@finledger.com', password: hashedPassword, role: 'ca', companyId: company._id },
      { name: 'Neha Gupta', email: 'finance@finledger.com', password: hashedPassword, role: 'finance_team', companyId: company._id },
      { name: 'Audit Team', email: 'auditor@finledger.com', password: hashedPassword, role: 'auditor', companyId: company._id },
    ]);
    console.log('Users created');

    const caUser = users[1];

    // 3. Create Financial Targets for 2024-25
    await FinancialTarget.insertMany([
      { companyId: company._id, financialYear: '2024-25', metric: 'Revenue', annualTarget: 12000000, createdBy: caUser._id },
      { companyId: company._id, financialYear: '2024-25', metric: 'Expenses', annualTarget: 8000000, createdBy: caUser._id },
      { companyId: company._id, financialYear: '2024-25', metric: 'NetProfit', annualTarget: 4000000, createdBy: caUser._id },
    ]);

    // 4. Create Budgets for 2024-225
    const budgetCategories = ['COGS', 'Opex', 'Capex', 'Finance', 'Tax', 'Other'];
    for (const cat of budgetCategories) {
      const annual = cat === 'Opex' ? 5000000 : 500000;
      await Budget.create({
        companyId: company._id,
        financialYear: '2024-25',
        category: cat,
        annualBudget: annual,
        monthlyBreakdown: FY_MONTHS.map(m => ({ month: m, allocated: annual / 12 })),
        createdBy: caUser._id,
        status: 'approved'
      });
    }

    // 5. Create 2 Years of Transactions (2023-24 and 2024-25)
    const years = ['2023-24', '2024-25'];
    const incomeCategories = ['Operating', 'Non-Operating', 'Other'];
    const expenseCategories = ['COGS', 'Opex', 'Capex', 'Finance', 'Tax'];

    for (const fy of years) {
      const startYear = parseInt(fy.split('-')[0]);
      
      for (let i = 0; i < FY_MONTHS.length; i++) {
        const month = FY_MONTHS[i];
        const year = i < 9 ? startYear : startYear + 1;
        const date = new Date(year, 4 + i, 15); // Shifted for April start
        
        // Income
        const revBase = fy === '2024-25' ? 1000000 : 800000;
        const revRand = Math.random() * 200000 - 100000;
        const rev = revBase + revRand;

        await IncomeTransaction.create({
          companyId: company._id,
          date,
          category: 'Operating',
          description: `Consultancy Fees - ${month} ${year}`,
          amount: rev,
          gstApplicable: true,
          gstRate: 18,
          gstAmount: rev * 0.18,
          totalWithGst: rev * 1.18,
          financialYear: fy,
          month,
          createdBy: caUser._id
        });

        // Expenses
        const expBase = rev * 0.6;
        for (const cat of expenseCategories) {
          const catAmt = (expBase / expenseCategories.length) * (0.8 + Math.random() * 0.4);
          await ExpenseTransaction.create({
            companyId: company._id,
            date,
            category: cat as any,
            description: `${cat} payment - ${month}`,
            amount: catAmt,
            gstInput: true,
            gstRate: 12,
            gstAmount: catAmt * 0.12,
            financialYear: fy,
            month,
            createdBy: caUser._id
          });
        }

        // 6. Balance Sheet entry for ratio calc
        // Simple linear progression of assets
        const assetsBase = 5000000 + (years.indexOf(fy) * 12 + i) * 200000;
        const liabilities = assetsBase * 0.4;
        
        await BalanceSheetEntry.create({
          companyId: company._id,
          financialYear: fy,
          month,
          date,
          totalAssets: assetsBase,
          currentAssets: assetsBase * 0.6,
          cashAndEquivalents: assetsBase * 0.2,
          inventory: assetsBase * 0.1,
          receivables: assetsBase * 0.3,
          totalLiabilities: liabilities,
          currentLiabilities: liabilities * 0.5,
          totalDebt: liabilities * 0.8,
          shareholdersEquity: assetsBase - liabilities,
          netRevenue: rev,
          cogs: expBase / 5, 
          ebit: rev * 0.3,
          netProfit: rev * 0.2,
          capitalEmployed: (assetsBase - liabilities) + (liabilities * 0.8),
          ebitda: rev * 0.35,
          interestExpense: 20000,
          netCreditSales: rev * 0.8,
          netCreditPurchases: (expBase / 5) * 0.7
        });
      }
    }

    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
