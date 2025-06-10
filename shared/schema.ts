import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  points: integer("points").notNull().default(0),
  coinBalance: integer("coin_balance").notNull().default(0), // converted coins
  usdBalance: integer("usd_balance").notNull().default(0), // in cents
  egpBalance: integer("egp_balance").notNull().default(0), // in piastres
  // Separate investment balances for Points Investment section
  investmentUsdBalance: integer("investment_usd_balance").notNull().default(0), // in cents
  investmentEgpBalance: integer("investment_egp_balance").notNull().default(0), // in piastres
  adsWatchedToday: integer("ads_watched_today").notNull().default(0),
  lastAdWatch: timestamp("last_ad_watch"),
  adLimitResetTime: timestamp("ad_limit_reset_time"),
  referralCode: text("referral_code").notNull().unique(), // User's own 6-digit referral code
  referredByCode: text("referred_by_code"), // The referral code that invited this user
  referredById: integer("referred_by_id"), // ID of the user who invited this user
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adTasks = pgTable("ad_tasks", {
  id: serial("id").primaryKey(),
  pointsPerView: integer("points_per_view").notNull().default(500),
  dailyLimit: integer("daily_limit").notNull().default(50),
  cooldownSeconds: integer("cooldown_seconds").notNull().default(15),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(0.25),
  isActive: boolean("is_active").notNull().default(true),
});

export const appTasks = pgTable("app_tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull(),
  reward: integer("reward").notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const linkTasks = pgTable("link_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull(),
  reward: integer("reward").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taskCompletions = pgTable("task_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  taskType: text("task_type").notNull(), // "app" | "link"
  taskId: integer("task_id").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const quests = pgTable("quests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "invite_friends" | "watch_ads" | "complete_tasks"
  target: integer("target").notNull(),
  reward: integer("reward").notNull(),
  icon: text("icon").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const questProgress = pgTable("quest_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  questId: integer("quest_id").notNull(),
  progress: integer("progress").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredId: integer("referred_id").notNull(),
  pointsEarned: integer("points_earned").notNull().default(1000),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(), // "usd" | "egp"
  method: text("method").notNull(),
  accountDetails: text("account_details"),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// New tables for admin settings
export const depositMethods = pgTable("deposit_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  extraFieldType: text("extra_field_type"), // "text", "email", "file"
  extraFieldLabel: text("extra_field_label"),
  isActive: boolean("is_active").notNull().default(true),
  minAmount: integer("min_amount").notNull().default(0),
  maxAmount: integer("max_amount").notNull().default(1000000),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const withdrawalMethods = pgTable("withdrawal_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  minAmount: integer("min_amount").notNull().default(0),
  maxAmount: integer("max_amount").notNull().default(1000000),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  fromCurrency: text("from_currency").notNull(), // "points"
  toCurrency: text("to_currency").notNull(), // "usd" | "egp"
  rate: text("rate").notNull(), // decimal rate as string to preserve precision
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const investmentPackages = pgTable("investment_packages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // "own" | "points"
  price: integer("price").notNull(),
  numberOfDays: integer("number_of_days").notNull(),
  rewardPerTask: integer("reward_per_task").notNull(),
  rewardCurrency: text("reward_currency").notNull(), // "points" | "coin" | "usd" | "egp"
  adRewardPercentage: integer("ad_reward_percentage").notNull().default(10), // Percentage of daily reward for watching ads
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userInvestments = pgTable("user_investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  packageId: integer("package_id").notNull().references(() => investmentPackages.id, { onDelete: 'cascade' }),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  tasksCompletedToday: integer("tasks_completed_today").notNull().default(0),
  lastTaskDate: timestamp("last_task_date"),
  adsWatchedToday: integer("ads_watched_today").notNull().default(0),
  lastAdWatch: timestamp("last_ad_watch"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const depositRequests = pgTable("deposit_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(), // "usd" | "egp"
  method: text("method").notNull(),
  depositType: text("deposit_type").notNull(), // "main" | "investment"
  accountDetails: text("account_details"),
  transactionProof: text("transaction_proof"),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  taskCompletions: many(taskCompletions),
  questProgress: many(questProgress),
  referrals: many(referrals),
  withdrawalRequests: many(withdrawalRequests),
}));

export const taskCompletionRelations = relations(taskCompletions, ({ one }) => ({
  user: one(users, {
    fields: [taskCompletions.userId],
    references: [users.id],
  }),
}));

export const questProgressRelations = relations(questProgress, ({ one }) => ({
  user: one(users, {
    fields: [questProgress.userId],
    references: [users.id],
  }),
  quest: one(quests, {
    fields: [questProgress.questId],
    references: [quests.id],
  }),
}));

export const referralRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
  }),
  referred: one(users, {
    fields: [referrals.referredId],
    references: [users.id],
  }),
}));

export const withdrawalRequestRelations = relations(withdrawalRequests, ({ one }) => ({
  user: one(users, {
    fields: [withdrawalRequests.userId],
    references: [users.id],
  }),
}));

export const investmentPackageRelations = relations(investmentPackages, ({ many }) => ({
  userInvestments: many(userInvestments),
}));

export const userInvestmentRelations = relations(userInvestments, ({ one }) => ({
  user: one(users, {
    fields: [userInvestments.userId],
    references: [users.id],
  }),
  package: one(investmentPackages, {
    fields: [userInvestments.packageId],
    references: [investmentPackages.id],
  }),
}));

export const depositRequestRelations = relations(depositRequests, ({ one }) => ({
  user: one(users, {
    fields: [depositRequests.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAppTaskSchema = createInsertSchema(appTasks).omit({
  id: true,
  createdAt: true,
});

export const insertLinkTaskSchema = createInsertSchema(linkTasks).omit({
  id: true,
  createdAt: true,
});

export const insertQuestSchema = createInsertSchema(quests).omit({
  id: true,
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).omit({
  id: true,
  createdAt: true,
});

export const insertDepositMethodSchema = createInsertSchema(depositMethods).omit({
  id: true,
  createdAt: true,
});

export const insertWithdrawalMethodSchema = createInsertSchema(withdrawalMethods).omit({
  id: true,
  createdAt: true,
});

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  updatedAt: true,
});

export const insertInvestmentPackageSchema = createInsertSchema(investmentPackages).omit({
  id: true,
  createdAt: true,
});

export const insertUserInvestmentSchema = createInsertSchema(userInvestments).omit({
  id: true,
  createdAt: true,
});

export const insertDepositRequestSchema = createInsertSchema(depositRequests).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type AppTask = typeof appTasks.$inferSelect;
export type InsertAppTask = z.infer<typeof insertAppTaskSchema>;
export type LinkTask = typeof linkTasks.$inferSelect;
export type InsertLinkTask = z.infer<typeof insertLinkTaskSchema>;
export type Quest = typeof quests.$inferSelect;
export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type QuestProgress = typeof questProgress.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type AdTask = typeof adTasks.$inferSelect;
export type DepositMethod = typeof depositMethods.$inferSelect;
export type InsertDepositMethod = z.infer<typeof insertDepositMethodSchema>;
export type WithdrawalMethod = typeof withdrawalMethods.$inferSelect;
export type InsertWithdrawalMethod = z.infer<typeof insertWithdrawalMethodSchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type InvestmentPackage = typeof investmentPackages.$inferSelect;
export type InsertInvestmentPackage = z.infer<typeof insertInvestmentPackageSchema>;
export type UserInvestment = typeof userInvestments.$inferSelect;
export type InsertUserInvestment = z.infer<typeof insertUserInvestmentSchema>;
export type DepositRequest = typeof depositRequests.$inferSelect;
export type InsertDepositRequest = z.infer<typeof insertDepositRequestSchema>;