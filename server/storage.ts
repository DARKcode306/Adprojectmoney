import { db } from "./db";
import { eq, and, gte, lt } from "drizzle-orm";
import { 
  users, 
  appTasks, 
  linkTasks, 
  taskCompletions, 
  quests, 
  questProgress, 
  referrals, 
  withdrawalRequests,
  depositRequests,
  depositMethods,
  withdrawalMethods,
  exchangeRates,
  investmentPackages,
  userInvestments
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Tasks
  getAppTasks(): Promise<AppTask[]>;
  getLinkTasks(): Promise<LinkTask[]>;
  getAdTaskSettings(): Promise<AdTask>;
  createAppTask(task: InsertAppTask): Promise<AppTask>;
  createLinkTask(task: InsertLinkTask): Promise<LinkTask>;
  updateAppTask(id: number, updates: Partial<AppTask>): Promise<AppTask | undefined>;
  updateLinkTask(id: number, updates: Partial<LinkTask>): Promise<LinkTask | undefined>;
  deleteAppTask(id: number): Promise<boolean>;
  deleteLinkTask(id: number): Promise<boolean>;

  // Task Completions
  getTaskCompletion(userId: number, taskType: string, taskId: number): Promise<TaskCompletion | undefined>;
  createTaskCompletion(userId: number, taskType: string, taskId: number): Promise<TaskCompletion>;
  getUserTaskCompletions(userId: number): Promise<TaskCompletion[]>;

  // Quests
  getQuests(): Promise<Quest[]>;
  createQuest(quest: InsertQuest): Promise<Quest>;
  updateQuest(id: number, updates: Partial<Quest>): Promise<Quest | undefined>;
  deleteQuest(id: number): Promise<boolean>;
  getUserQuestProgress(userId: number): Promise<QuestProgress[]>;
  updateQuestProgress(userId: number, questId: number, progress: number): Promise<QuestProgress>;

  // Referrals
  getUserReferrals(userId: number): Promise<Referral[]>;
  createReferral(referrerId: number, referredId: number): Promise<Referral>;

  // Withdrawals
  getWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  getUserWithdrawalRequests(userId: number): Promise<WithdrawalRequest[]>;
  createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest>;

  // Admin - Payment Methods
  getDepositMethods(): Promise<DepositMethod[]>;
  createDepositMethod(method: InsertDepositMethod): Promise<DepositMethod>;
  updateDepositMethod(id: number, updates: Partial<DepositMethod>): Promise<DepositMethod | undefined>;
  deleteDepositMethod(id: number): Promise<boolean>;

  getWithdrawalMethods(): Promise<WithdrawalMethod[]>;
  createWithdrawalMethod(method: InsertWithdrawalMethod): Promise<WithdrawalMethod>;
  updateWithdrawalMethod(id: number, updates: Partial<WithdrawalMethod>): Promise<WithdrawalMethod | undefined>;
  deleteWithdrawalMethod(id: number): Promise<boolean>;

  // Admin - Exchange Rates
  getExchangeRates(): Promise<ExchangeRate[]>;
  createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate>;
  updateExchangeRate(id: number, updates: Partial<ExchangeRate>): Promise<ExchangeRate | undefined>;
  deleteExchangeRate(id: number): Promise<boolean>;

    // Investment Packages
  getInvestmentPackages(type?: string): Promise<any>;
  createInvestmentPackage(data: any): Promise<any>;
  updateInvestmentPackage(id: number, updates: any): Promise<any>;
  deleteInvestmentPackage(id: number): Promise<boolean>;

  // User Investments
  getUserInvestments(userId: number): Promise<any>;
  createUserInvestment(data: any): Promise<any>;
  updateUserInvestment(id: number, updates: any): Promise<any>;
  getActiveUserInvestments(userId: number): Promise<any>;

    // Quest Progress Completion
  updateQuestProgressCompletion(userId: number, questId: number, isCompleted: boolean): Promise<QuestProgress>;
  createQuestProgressWithCompletion(userId: number, questId: number, progress: number, isCompleted: boolean): Promise<QuestProgress>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode));
    return user || undefined;
  }

  async generateUniqueReferralCode(): Promise<string> {
    let code: string;
    let exists = true;

    while (exists) {
      // Generate 6-character alphanumeric code
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await this.getUserByReferralCode(code);
      exists = !!existing;
    }

    return code!;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      console.log("Creating user with data:", insertUser);
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      console.log("User created successfully:", user);
      return user;
    } catch (error) {
      console.error("Database error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Tasks
  async getAppTasks(): Promise<AppTask[]> {
    return await db.select().from(appTasks).where(eq(appTasks.isActive, true));
  }

  async getLinkTasks(): Promise<LinkTask[]> {
    return await db.select().from(linkTasks).where(eq(linkTasks.isActive, true));
  }

  async getAdTaskSettings(): Promise<AdTask> {
    try {
      const [settings] = await db.select().from(adTasks).where(eq(adTasks.isActive, true));

      if (!settings) {
        // Create default settings if none exist
        const [newSettings] = await db
          .insert(adTasks)
          .values({
            pointsPerView: 500,
            dailyLimit: 50,
            cooldownSeconds: 15,
            cooldownMinutes: "0.25",
            isActive: true
          })
          .returning();
        return newSettings;
      }

      return settings;
    } catch (error) {
      // Fallback to default values if table doesn't exist yet
      return {
        id: 1,
        pointsPerView: 500,
        dailyLimit: 50,
        cooldownSeconds: 15,
        cooldownMinutes: "0.25",
        isActive: true,
        createdAt: new Date()
      } as AdTask;
    }
  }

  async createAppTask(insertTask: InsertAppTask): Promise<AppTask> {
    const [task] = await db
      .insert(appTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async createLinkTask(insertTask: InsertLinkTask): Promise<LinkTask> {
    const [task] = await db
      .insert(linkTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateAppTask(id: number, updates: Partial<AppTask>): Promise<AppTask | undefined> {
    const [task] = await db
      .update(appTasks)
      .set(updates)
      .where(eq(appTasks.id, id))
      .returning();
    return task || undefined;
  }

  async updateLinkTask(id: number, updates: Partial<LinkTask>): Promise<LinkTask | undefined> {
    const [task] = await db
      .update(linkTasks)
      .set(updates)
      .where(eq(linkTasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteAppTask(id: number): Promise<boolean> {
    const result = await db.delete(appTasks).where(eq(appTasks.id, id));
    return (result.rowCount || 0) > 0;
  }

  async deleteLinkTask(id: number): Promise<boolean> {
    const result = await db.delete(linkTasks).where(eq(linkTasks.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Task Completions
  async getTaskCompletion(userId: number, taskType: string, taskId: number): Promise<TaskCompletion | undefined> {
    const [completion] = await db
      .select()
      .from(taskCompletions)
      .where(and(
        eq(taskCompletions.userId, userId),
        eq(taskCompletions.taskType, taskType),
        eq(taskCompletions.taskId, taskId)
      ));
    return completion || undefined;
  }

  async createTaskCompletion(userId: number, taskType: string, taskId: number): Promise<TaskCompletion> {
    const [completion] = await db
      .insert(taskCompletions)
      .values({ userId, taskType, taskId })
      .returning();
    return completion;
  }

  async getUserTaskCompletions(userId: number): Promise<TaskCompletion[]> {
    return await db.select().from(taskCompletions).where(eq(taskCompletions.userId, userId));
  }

  // Quests
  async getQuests(): Promise<Quest[]> {
    return await db.select().from(quests).where(eq(quests.isActive, true));
  }

  async createQuest(insertQuest: InsertQuest): Promise<Quest> {
    const [quest] = await db
      .insert(quests)
      .values(insertQuest)
      .returning();
    return quest;
  }

  async updateQuest(id: number, updates: Partial<Quest>): Promise<Quest | undefined> {
    const [quest] = await db
      .update(quests)
      .set(updates)
      .where(eq(quests.id, id))
      .returning();
    return quest || undefined;
  }

  async deleteQuest(id: number): Promise<boolean> {
    const result = await db.delete(quests).where(eq(quests.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getUserQuestProgress(userId: number): Promise<QuestProgress[]> {
    return await db.select().from(questProgress).where(eq(questProgress.userId, userId));
  }

  async updateQuestProgress(userId: number, questId: number, progress: number): Promise<QuestProgress> {
    const [existing] = await db
      .select()
      .from(questProgress)
      .where(and(
        eq(questProgress.userId, userId),
        eq(questProgress.questId, questId)
      ));

    if (existing) {
      const [updated] = await db
        .update(questProgress)
        .set({ progress })
        .where(eq(questProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(questProgress)
        .values({ userId, questId, progress })
        .returning();
      return created;
    }
  }

  async updateQuestProgressCompletion(userId: number, questId: number, isCompleted: boolean): Promise<QuestProgress> {
    const [existing] = await db
      .select()
      .from(questProgress)
      .where(and(
        eq(questProgress.userId, userId),
        eq(questProgress.questId, questId)
      ));

    if (existing) {
      const [updated] = await db
        .update(questProgress)
        .set({ 
          isCompleted, 
          completedAt: isCompleted ? new Date() : null 
        })
        .where(eq(questProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      throw new Error("Quest progress not found");
    }
  }

  async createQuestProgressWithCompletion(userId: number, questId: number, progress: number, isCompleted: boolean): Promise<QuestProgress> {
    const [created] = await db
      .insert(questProgress)
      .values({ 
        userId, 
        questId, 
        progress, 
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      })
      .returning();
    return created;
  }

  // Referrals
  async getUserReferrals(userId: number): Promise<Referral[]> {
    try {
      return await db.select().from(referrals).where(eq(referrals.referrerId, userId));
    } catch (error) {
      console.error("Error getting user referrals:", error);
      return [];
    }
  }

  async createReferral(referrerId: number, referredId: number): Promise<Referral> {
    const [referral] = await db
      .insert(referrals)
      .values({ referrerId, referredId, pointsEarned: 1000 })
      .returning();
    return referral;
  }

  // Withdrawals
  async getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests);
  }

  async getUserWithdrawalRequests(userId: number): Promise<WithdrawalRequest[]> {
    return await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, userId));
  }

  async createWithdrawalRequest(insertRequest: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [request] = await db
      .insert(withdrawalRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  // Admin - Payment Methods
  async getDepositMethods(): Promise<DepositMethod[]> {
    try {
      return await db.select().from(depositMethods);
    } catch (error) {
      console.error("Error getting deposit methods:", error);
      return [];
    }
  }

  async createDepositMethod(insertMethod: InsertDepositMethod): Promise<DepositMethod> {
    try {
      console.log("Creating deposit method with data:", insertMethod);
      const [method] = await db
        .insert(depositMethods)
        .values(insertMethod)
        .returning();
      console.log("Deposit method created successfully:", method);
      return method;
    } catch (error) {
      console.error("Error creating deposit method:", error);
      throw error;
    }
  }

  async updateDepositMethod(id: number, updates: Partial<DepositMethod>): Promise<DepositMethod | undefined> {
    const [method] = await db
      .update(depositMethods)
      .set(updates)
      .where(eq(depositMethods.id, id))
      .returning();
    return method || undefined;
  }

  async deleteDepositMethod(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(depositMethods)
      .where(eq(depositMethods.id, id))
      .returning();
    return !!deleted;
  }

  async getDepositRequestById(id: number): Promise<DepositRequest | undefined> {
    const [request] = await db
      .select()
      .from(depositRequests)
      .where(eq(depositRequests.id, id));
    return request || undefined;
  }

  async updateDepositRequestStatus(id: number, status: string): Promise<void> {
    await db
      .update(depositRequests)
      .set({ status })
      .where(eq(depositRequests.id, id));
  }

  async getDepositRequests(): Promise<DepositRequest[]> {
    return await db.select().from(depositRequests);
  }

  async getUserDepositRequests(userId: number): Promise<DepositRequest[]> {
    return await db.select().from(depositRequests).where(eq(depositRequests.userId, userId));
  }

  async createDepositRequest(insertRequest: InsertDepositRequest): Promise<DepositRequest> {
    const [request] = await db
      .insert(depositRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async getWithdrawalMethods(): Promise<WithdrawalMethod[]> {
    return await db.select().from(withdrawalMethods);
  }

  async createWithdrawalMethod(insertMethod: InsertWithdrawalMethod): Promise<WithdrawalMethod> {
    const [method] = await db
      .insert(withdrawalMethods)
      .values(insertMethod)
      .returning();
    return method;
  }

  async updateWithdrawalMethod(id: number, updates: Partial<WithdrawalMethod>): Promise<WithdrawalMethod | undefined> {
    const [method] = await db
      .update(withdrawalMethods)
      .set(updates)
      .where(eq(withdrawalMethods.id, id))
      .returning();
    return method || undefined;
  }

  async deleteWithdrawalMethod(id: number): Promise<boolean> {
    const result = await db.delete(withdrawalMethods).where(eq(withdrawalMethods.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Admin - Exchange Rates
  async getExchangeRates(): Promise<ExchangeRate[]> {
    return await db.select().from(exchangeRates);
  }

  async createExchangeRate(insertRate: InsertExchangeRate): Promise<ExchangeRate> {
    const [rate] = await db
      .insert(exchangeRates)
      .values(insertRate)
      .returning();
    return rate;
  }

  async updateExchangeRate(id: number, updates: Partial<ExchangeRate>): Promise<ExchangeRate | undefined> {
    const [rate] = await db
      .update(exchangeRates)
      .set(updates)
      .where(eq(exchangeRates.id, id))
      .returning();
    return rate || undefined;
  }

  async deleteExchangeRate(id: number): Promise<boolean> {
    const result = await db.delete(exchangeRates).where(eq(exchangeRates.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Investment Packages
  async getInvestmentPackages(type?: string): Promise<any> {
    try {
      if (type) {
        return await db.select().from(investmentPackages).where(eq(investmentPackages.type, type));
      }
      return await db.select().from(investmentPackages);
    } catch (error) {
      console.error("Error getting investment packages:", error);
      return [];
    }
  }

  async createInvestmentPackage(data: any): Promise<any> {
    const [package_] = await db.insert(investmentPackages).values(data).returning();
    return package_;
  }

  async updateInvestmentPackage(id: number, updates: any): Promise<any> {
    const [package_] = await db.update(investmentPackages)
      .set(updates)
      .where(eq(investmentPackages.id, id))
      .returning();
    return package_;
  }

  async deleteInvestmentPackage(id: number): Promise<boolean> {
    const result = await db.delete(investmentPackages).where(eq(investmentPackages.id, id));
    return (result.rowCount || 0) > 0;
  }

  // User Investments
  async getUserInvestments(userId: number): Promise<any> {
    return await db.select({
      id: userInvestments.id,
      userId: userInvestments.userId,
      packageId: userInvestments.packageId,
      startDate: userInvestments.startDate,
      endDate: userInvestments.endDate,
      isActive: userInvestments.isActive,
      tasksCompletedToday: userInvestments.tasksCompletedToday,
      lastTaskDate: userInvestments.lastTaskDate,
      createdAt: userInvestments.createdAt,
      package: {
        id: investmentPackages.id,
        title: investmentPackages.title,
        type: investmentPackages.type,
        price: investmentPackages.price,
        numberOfDays: investmentPackages.numberOfDays,
        rewardPerTask: investmentPackages.rewardPerTask,
        rewardCurrency: investmentPackages.rewardCurrency
      }
    })
    .from(userInvestments)
    .leftJoin(investmentPackages, eq(userInvestments.packageId, investmentPackages.id))
    .where(eq(userInvestments.userId, userId));
  }

  async createUserInvestment(data: any): Promise<any> {
    const [investment] = await db.insert(userInvestments).values(data).returning();
    return investment;
  }

  async updateUserInvestment(id: number, updates: any): Promise<any> {
    const [investment] = await db.update(userInvestments)
      .set(updates)
      .where(eq(userInvestments.id, id))
      .returning();
    return investment;
  }

  async getActiveUserInvestments(userId: number): Promise<any> {
    const now = new Date();
    return await db.select({
      id: userInvestments.id,
      userId: userInvestments.userId,
      packageId: userInvestments.packageId,
      startDate: userInvestments.startDate,
      endDate: userInvestments.endDate,
      isActive: userInvestments.isActive,
      tasksCompletedToday: userInvestments.tasksCompletedToday,
      lastTaskDate: userInvestments.lastTaskDate,
      createdAt: userInvestments.createdAt,
      package: {
        id: investmentPackages.id,
        title: investmentPackages.title,
        type: investmentPackages.type,
        price: investmentPackages.price,
        numberOfDays: investmentPackages.numberOfDays,
        rewardPerTask: investmentPackages.rewardPerTask,
        rewardCurrency: investmentPackages.rewardCurrency
      }
    })
    .from(userInvestments)
    .leftJoin(investmentPackages, eq(userInvestments.packageId, investmentPackages.id))
    .where(
      and(
        eq(userInvestments.userId, userId),
        eq(userInvestments.isActive, true),
        gte(userInvestments.endDate, now)
      )
    );
  }

  async deactivateExpiredInvestments() {
    const now = new Date();
    const result = await db
      .update(userInvestments)
      .set({ isActive: false })
      .where(and(
        eq(userInvestments.isActive, true),
        lt(userInvestments.endDate, now)
      ))
      .returning();
    return result;
  }

  // Withdrawal Request Management
  async getWithdrawalRequestById(id: number): Promise<WithdrawalRequest | undefined> {
    const [request] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, id));
    return request || undefined;
  }

  async updateWithdrawalRequestStatus(id: number, status: string): Promise<boolean> {
    const result = await db
      .update(withdrawalRequests)
      .set({ status })
      .where(eq(withdrawalRequests.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(users.createdAt);
  }

  generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  async processReferral(newUserId: number, referralCode: string): Promise<boolean> {
    try {
      // Find the referrer by their referral code
      const referrerResult = await this.db.execute(
        `SELECT id, telegram_id FROM users WHERE referral_code = $1`,
        [referralCode]
      )

      if (referrerResult.rows.length === 0) {
        console.log(`❌ Referral code ${referralCode} not found`)
        return false
      }

      const referrer = referrerResult.rows[0] as any

      // Award referral bonus to the referrer
      await this.db.execute(
        `UPDATE users SET points = points + 1000 WHERE id = $1`,
        [referrer.id]
      )

      // Create referral record
      await this.db.execute(
        `INSERT INTO referrals (referrer_id, referred_id, bonus_points, created_at)
         VALUES ($1, $2, 1000, NOW())`,
        [referrer.id, newUserId]
      )

      console.log(`✅ Referral processed: User ${referrer.id} referred user ${newUserId}`)
      return true
    } catch (error) {
      console.error('❌ Error processing referral:', error)
      return false
    }
  }
}

export const storage = new DatabaseStorage();