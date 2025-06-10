import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertAppTaskSchema, 
  insertLinkTaskSchema, 
  insertWithdrawalRequestSchema,
  insertQuestSchema,
  insertDepositMethodSchema,
  insertWithdrawalMethodSchema,
  insertExchangeRateSchema,
  insertInvestmentPackageSchema,
  insertDepositRequestSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {

  // Auth/User routes
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const { telegramId, username, firstName, lastName, referralCode } = req.body;

      console.log("Auth attempt for:", { telegramId, username, firstName, referralCode });

      let user = await storage.getUserByTelegramId(telegramId);

      if (!user) {
        console.log("Creating new user...");
        const userReferralCode = await storage.generateUniqueReferralCode();

        // Handle referral processing
        let referredByCode = null;
        let referredById = null;
        let startingPoints = 0;

        if (referralCode && referralCode.length > 0) {
          console.log("Processing referral code:", referralCode);

          // Find referrer by referral code
          const referrer = await storage.getUserByReferralCode(referralCode);
          if (referrer) {
            console.log("Found referrer:", referrer.id, "code:", referrer.referralCode);
            referredByCode = referralCode;
            referredById = referrer.id;
            startingPoints = 500; // Welcome bonus for referred users
          } else {
            console.log("Referrer not found with code:", referralCode);
          }
        }

        user = await storage.createUser({
          telegramId: telegramId.toString(),
          username: username || `user_${telegramId}`,
          firstName: firstName || "User",
          lastName: lastName || null,
          points: startingPoints,
          coinBalance: 0,
          usdBalance: 0,
          egpBalance: 0,
          adsWatchedToday: 0,
          lastAdWatch: null,
          referralCode: userReferralCode,
          referredByCode: referredByCode,
          referredById: referredById
        });

        console.log("New user created:", user.id, "with referral code:", userReferralCode);

        // Process referral rewards
        if (referredById) {
          try {
            const referrer = await storage.getUser(referredById);
            if (referrer) {
              // Check if referral already exists to prevent duplicates
              const existingReferrals = await storage.getUserReferrals(referrer.id);
              const alreadyReferred = existingReferrals.find(r => r.referredId === user.id);

              if (!alreadyReferred) {
                // Create referral record
                await storage.createReferral(referrer.id, user.id);

                // Give bonus points to referrer
                await storage.updateUser(referrer.id, {
                  points: referrer.points + 1000
                });

                console.log(`Referral successful! Referrer ${referrer.id} got 1000 points, New user ${user.id} got 500 points`);
              } else {
                console.log("Referral already exists - skipping duplicate");
              }
            }
          } catch (e) {
            console.error("Error processing referral rewards:", e);
          }
        }
      } else {
        console.log("Existing user found:", user.id);
      }

      res.json({ user });
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(500).json({ message: "Authentication failed", error: error.message });
    }
  });

  app.get("/api/user/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Task routes
  app.get("/api/tasks/app", async (req, res) => {
    try {
      const tasks = await storage.getAppTasks();
      res.json({ tasks });
    } catch (error) {
      res.status(500).json({ message: "Failed to get app tasks" });
    }
  });

  app.get("/api/tasks/link", async (req, res) => {
    try {
      const tasks = await storage.getLinkTasks();
      res.json({ tasks });
    } catch (error) {
      res.status(500).json({ message: "Failed to get link tasks" });
    }
  });

  app.get("/api/tasks/ad", async (req, res) => {
    try {
      const settings = await storage.getAdTaskSettings();
      res.json({ settings });
    } catch (error) {
      res.status(500).json({ message: "Failed to get ad settings" });
    }
  });

  app.post("/api/tasks/app", async (req, res) => {
    try {
      const taskData = insertAppTaskSchema.parse(req.body);
      const task = await storage.createAppTask(taskData);
      res.json({ task });
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.post("/api/tasks/link", async (req, res) => {
    try {
      const taskData = insertLinkTaskSchema.parse(req.body);
      const task = await storage.createLinkTask(taskData);
      res.json({ task });
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.delete("/api/tasks/app/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAppTask(parseInt(req.params.id));
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json({ message: "Task deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.delete("/api/tasks/link/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLinkTask(parseInt(req.params.id));
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json({ message: "Task deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Task completion routes
  app.post("/api/tasks/complete", async (req, res) => {
    try {
      const { userId, taskType, taskId } = req.body;

      // Check if already completed
      const existingCompletion = await storage.getTaskCompletion(userId, taskType, taskId);
      if (existingCompletion) {
        return res.status(400).json({ message: "Task already completed" });
      }

      // Get task details for reward
      let reward = 0;
      if (taskType === "app") {
        const tasks = await storage.getAppTasks();
        const task = tasks.find(t => t.id === taskId);
        reward = task?.reward || 0;
      } else if (taskType === "link") {
        const tasks = await storage.getLinkTasks();
        const task = tasks.find(t => t.id === taskId);
        reward = task?.reward || 0;
      }

      // Create completion
      await storage.createTaskCompletion(userId, taskType, taskId);

      // Update user points
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUser(userId, { points: user.points + reward });
      }

      res.json({ message: "Task completed", reward });
    } catch (error) {
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.get("/api/tasks/completions/:userId", async (req, res) => {
    try {
      const completions = await storage.getUserTaskCompletions(parseInt(req.params.userId));
      res.json({ completions });
    } catch (error) {
      res.status(500).json({ message: "Failed to get completions" });
    }
  });

  // Daily reward routes
  app.get("/api/daily-reward/status/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Parse last claim date from referredBy field if it contains daily reward data
      let lastClaimDate = null;
      let currentStreak = 1;

      if (user.referredBy && user.referredBy.startsWith('daily_')) {
        const parts = user.referredBy.split('_');
        if (parts.length >= 3) {
          lastClaimDate = parts[1]; // YYYY-MM-DD format
          currentStreak = parseInt(parts[2]) || 1;
        }
      }

      // Check if user can claim today
      const canClaim = !lastClaimDate || lastClaimDate !== todayStr;

      // Calculate what the new streak would be if they claim today
      let nextStreak = currentStreak;
      if (canClaim && lastClaimDate) {
        const lastDate = new Date(lastClaimDate);
        const todayDate = new Date(todayStr);
        const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          // Consecutive day
          nextStreak = Math.min(currentStreak + 1, 7);
        } else if (daysDiff > 1) {
          // Streak broken, reset to day 1
          nextStreak = 1;
        }
      } else if (canClaim && !lastClaimDate) {
        // First time claiming
        nextStreak = 1;
      }

      const nextReward = nextStreak * 100;

      res.json({
        canClaim,
        streak: currentStreak,
        nextReward,
        lastClaimDate
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get daily reward status" });
    }
  });

  app.post("/api/daily-reward/claim", async (req, res) => {
    try {
      const { userId } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Parse current daily reward data
      let lastClaimDate = null;
      let currentStreak = 1;

      if (user.referredBy && user.referredBy.startsWith('daily_')) {
        const parts = user.referredBy.split('_');
        if (parts.length >= 3) {
          lastClaimDate = parts[1];
          currentStreak = parseInt(parts[2]) || 1;
        }
      }

      // Check if already claimed today
      if (lastClaimDate === todayStr) {
        return res.status(400).json({ message: "تم استلام المكافأة اليوم بالفعل" });
      }

      // Calculate new streak
      let newStreak = 1;
      if (lastClaimDate) {
        const lastDate = new Date(lastClaimDate);
        const todayDate = new Date(todayStr);
        const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          // Consecutive day
          newStreak = Math.min(currentStreak + 1, 7);
        } else {
          // Streak broken or first claim
          newStreak = 1;
        }
      }

      const reward = newStreak * 100;
      const oldPoints = user.points;
      const newPoints = user.points + reward;

      console.log(`Daily reward claim: User ${userId}, old points: ${oldPoints}, reward: ${reward}, new points: ${newPoints}`);

      // Update user with new points and daily reward data in a single transaction
      await storage.updateUser(userId, {
        points: newPoints,
        referredBy: `daily_${todayStr}_${newStreak}` // Store: daily_YYYY-MM-DD_streak
      });

      // Verify the update was successful with fresh data
      const verifyUser = await storage.getUser(userId);
      console.log(`After update verification: User ${userId} points: ${verifyUser?.points}`);

      if (!verifyUser || verifyUser.points !== newPoints) {
        console.error(`Points update failed! Expected: ${newPoints}, Got: ${verifyUser?.points}`);
        return res.status(500).json({ message: "فشل في تحديث النقاط" });
      }

      res.json({ 
        message: "تم استلام المكافأة اليومية بنجاح", 
        reward, 
        streak: newStreak,
        user: verifyUser,
        oldPoints,
        newPoints: verifyUser.points,
        success: true
      });
    } catch (error) {
      console.error("Daily reward claim error:", error);
      res.status(500).json({ message: "فشل في استلام المكافأة اليومية" });
    }
  });

  // Ad watching
  app.post("/api/ads/watch", async (req, res) => {
    try {
      const { userId } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const adSettings = await storage.getAdTaskSettings();

      // Check daily limit
      if (user.adsWatchedToday >= adSettings.dailyLimit) {
        return res.status(400).json({ message: "Daily limit reached" });
      }

      // Check cooldown (15 seconds)
      if (user.lastAdWatch) {
        const cooldownMs = 15 * 1000; // 15 seconds in milliseconds
        const timeSinceLastAd = Date.now() - user.lastAdWatch.getTime();
        if (timeSinceLastAd < cooldownMs) {
          return res.status(400).json({ message: "Cooldown active" });
        }
      }

      const newAdsWatched = user.adsWatchedToday + 1;
      let updateData: any = {
        points: user.points + adSettings.pointsPerView,
        adsWatchedToday: newAdsWatched,
        lastAdWatch: new Date()
      };

      // إذا وصل للحد اليومي، ابدأ تايمر إعادة التعيين (دقيقة واحدة)
      if (newAdsWatched >= adSettings.dailyLimit) {
        const resetTime = new Date();
        resetTime.setMinutes(resetTime.getMinutes() + 1);
        updateData.adLimitResetTime = resetTime;
      }

      // Update user
      await storage.updateUser(userId, updateData);

      res.json({ message: "Ad watched", reward: adSettings.pointsPerView });
    } catch (error) {
      res.status(500).json({ message: "Failed to watch ad" });
    }
  });

  // Reset daily ads limit
  app.post("/api/ads/reset-daily-limit", async (req, res) => {
    try {
      const { userId } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // إعادة تعيين الحد اليومي
      await storage.updateUser(userId, {
        adsWatchedToday: 0,
        adLimitResetTime: null
      });

      res.json({ message: "Daily ads limit reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset daily limit" });
    }
  });

  // Quest routes
  app.get("/api/quests", async (req, res) => {
    try {
      const quests = await storage.getQuests();
      res.json({ quests });
    } catch (error) {
      res.status(500).json({ message: "Failed to get quests" });
    }
  });

  app.get("/api/quests/progress/:userId", async (req, res) => {
    try {
      const progress = await storage.getUserQuestProgress(parseInt(req.params.userId));
      res.json({ progress });
    } catch (error) {
      res.status(500).json({ message: "Failed to get quest progress" });
    }
  });

  app.post("/api/quests/claim", async (req, res) => {
    try {
      const { userId, questId } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const quests = await storage.getQuests();
      const quest = quests.find(q => q.id === questId);

      if (!quest) {
        return res.status(404).json({ message: "Quest not found" });
      }

      // Check if quest is actually completed based on user's current progress
      let actualProgress = 0;
      switch (quest.type) {
        case "watch_ads":
          actualProgress = user.adsWatchedToday || 0;
          break;
        case "invite_friends":
          try {
            const referrals = await storage.getUserReferrals(userId);
            actualProgress = referrals.length;
          } catch (error) {
            actualProgress = 0;
          }
          break;
        case "complete_tasks":
          try {
            const completions = await storage.getUserTaskCompletions(userId);
            actualProgress = completions.length;
          } catch (error) {
            actualProgress = 0;
          }
          break;
        default:
          actualProgress = 0;
      }

      console.log(`Quest ${quest.id} (${quest.type}): progress=${actualProgress}, target=${quest.target}`);

      if (actualProgress < quest.target) {
        return res.status(400).json({ 
          message: "Quest not completed", 
          progress: actualProgress, 
          target: quest.target 
        });
      }

      // Check if already claimed
      const progress = await storage.getUserQuestProgress(userId);
      const questProgress = progress.find(p => p.questId === questId);

      if (questProgress?.isCompleted) {
        return res.status(400).json({ message: "Quest reward already claimed" });
      }

      // Mark quest as completed in database
      if (questProgress) {
        // Update existing progress record to mark as completed
        await storage.updateQuestProgress(userId, questId, actualProgress);
        await storage.updateQuestProgressCompletion(userId, questId, true);
      } else {
        // Create new progress record and mark as completed
        await storage.createQuestProgressWithCompletion(userId, questId, actualProgress, true);
      }

      // Update user points
      await storage.updateUser(userId, { points: user.points + quest.reward });

      res.json({ message: "Quest reward claimed", reward: quest.reward });
    } catch (error) {
      console.error("Quest claim error:", error);
      res.status(500).json({ message: "Failed to claim quest reward" });
    }
  });

  // Admin - Users Management
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Referral routes
  app.get("/api/referrals/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const referrals = await storage.getUserReferrals(userId);
      res.json({ referrals });
    } catch (error) {
      console.error("Failed to get referrals:", error);
      res.status(500).json({ message: "Failed to get referrals" });
    }
  });

  app.post("/api/referrals/create", async (req, res) => {
    try {
      const { referrerId, referredId } = req.body;

      // Check if referral already exists
      const existingReferrals = await storage.getUserReferrals(referrerId);
      const alreadyReferred = existingReferrals.find(r => r.referredId === referredId);

      if (alreadyReferred) {
        return res.status(400).json({ message: "User already referred" });
      }

      // Create referral
      const referral = await storage.createReferral(referrerId, referredId);

      // Give bonus points to referrer
      const referrer = await storage.getUser(referrerId);
      if (referrer) {
        await storage.updateUser(referrerId, {
          points: referrer.points + 1000
        });
      }

      res.json({ message: "Referral created successfully", referral });
    } catch (error) {
      console.error("Failed to create referral:", error);
      res.status(500).json({ message: "Failed to create referral" });
    }
  });

  // Exchange rates route
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const rates = await storage.getExchangeRates();
      // If no rates exist, return default rates
      if (rates.length === 0) {
        const defaultRates = [
          { id: 1, fromCurrency: "points", toCurrency: "usd", rate: "0.0001", isActive: true }, // 10000 points = $1
          { id: 2, fromCurrency: "points", toCurrency: "egp", rate: "0.005", isActive: true }   // 200 points = £1 EGP
        ];
        res.json({ rates: defaultRates });
      } else {
        res.json({ rates });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get exchange rates" });
    }
  });

  // Exchange routes
  app.post("/api/exchange", async (req, res) => {
    try {
      const { userId, points, currency } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.points < points) {
        return res.status(400).json({ message: "Insufficient points" });
      }

      // Get current exchange rates
      const rates = await storage.getExchangeRates();
      let exchangeRate = null;

      // Find the appropriate rate
      for (const rate of rates) {
        if (rate.fromCurrency === "points" && rate.toCurrency === currency && rate.isActive) {
          exchangeRate = rate;
          break;
        }
      }

      let amount = 0;

      if (currency === "usd") {
        const rate = exchangeRate ? parseFloat(exchangeRate.rate) : 0.0001; // Default: 10000 points = $1 USD
        amount = Math.floor(points * rate * 100); // cents
        await storage.updateUser(userId, {
          points: user.points - points,
          usdBalance: user.usdBalance + amount
        });
      } else if (currency === "egp") {
        const rate = exchangeRate ? parseFloat(exchangeRate.rate) : 0.005; // Default: 200 points = £1 EGP
        amount = Math.floor(points * rate * 100); // piastres
        await storage.updateUser(userId, {
          points: user.points - points,
          egpBalance: user.egpBalance + amount
        });
      }

      res.json({ message: "Exchange completed", amount });
    } catch (error) {
      res.status(500).json({ message: "Failed to exchange points" });
    }
  });

  // Withdrawal routes
  app.post("/api/withdrawals", async (req, res) => {
    try {
      const requestData = insertWithdrawalRequestSchema.parse(req.body);

      // Validate user has sufficient balance
      const user = await storage.getUser(requestData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (requestData.currency === "usd" && user.usdBalance < requestData.amount) {
        return res.status(400).json({ message: "Insufficient USD balance" });
      } else if (requestData.currency === "egp" && user.egpBalance < requestData.amount) {
        return res.status(400).json({ message: "Insufficient EGP balance" });
      }

      // Deduct the amount from user's balance immediately when creating the request
      if (requestData.currency === "usd") {
        await storage.updateUser(user.id, {
          usdBalance: user.usdBalance - requestData.amount
        });
      } else if (requestData.currency === "egp") {
        await storage.updateUser(user.id, {
          egpBalance: user.egpBalance - requestData.amount
        });
      }

      const request = await storage.createWithdrawalRequest(requestData);
      res.json({ request });
    } catch (error) {
      res.status(400).json({ message: "Invalid withdrawal request" });
    }
  });

  app.get("/api/withdrawals", async (req, res) => {
    try {
      const requests = await storage.getWithdrawalRequests();
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ message: "Failed to get withdrawal requests" });
    }
  });

  app.get("/api/withdrawals/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requests = await storage.getUserWithdrawalRequests(userId);
      // Sort by creation date, newest first
      const sortedRequests = requests.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json({ requests: sortedRequests });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user withdrawal requests" });
    }
  });

  // Admin - Approve withdrawal request
  app.post("/api/admin/withdrawals/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getWithdrawalRequestById(id);

      if (!request) {
        return res.status(404).json({ message: "Withdrawal request not found" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
      }

      // Just update request status to approved
      // Money was already deducted when the request was created
      await storage.updateWithdrawalRequestStatus(id, "approved");

      res.json({ message: "Withdrawal request approved" });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve withdrawal request" });
    }
  });

  // Admin - Reject withdrawal request
  app.post("/api/admin/withdrawals/:id/reject", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getWithdrawalRequestById(id);

      if (!request) {
        return res.status(404).json({ message: "Withdrawal request not found" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
      }

      // Get user to refund the amount
      const user = await storage.getUser(request.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Refund the amount back to user's balance
      if (request.currency === "usd") {
        await storage.updateUser(user.id, {
          usdBalance: user.usdBalance + request.amount
        });
      } else if (request.currency === "egp") {
        await storage.updateUser(user.id, {
          egpBalance: user.egpBalance + request.amount
        });
      }

      // Update request status to rejected
      await storage.updateWithdrawalRequestStatus(id, "rejected");

      res.json({ message: "Withdrawal request rejected and amount refunded" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reject withdrawal request" });
    }
  });

  // Telegram Bot Integration
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const { message, callback_query } = req.body;

      if (message) {
        const telegramId = message.from.id.toString();
        const username = message.from.username || `user_${telegramId}`;
        const firstName = message.from.first_name || "User";
        const lastName = message.from.last_name || null;
        const chatId = message.chat.id;

        if (message.text.startsWith("/start")) {
            // Extract referral code if present (for bot commands, not Web App)
            const parts = message.text.split(' ');
            let referralCode = null;
            if (parts.length > 1) {
              // Handle different referral formats
              const param = parts[1];
              if (param.startsWith('ref_')) {
                referralCode = param.substring(4);
              } else if (param.startsWith('r_')) {
                referralCode = param.substring(2);
              } else {
                // Direct 6-digit code
                referralCode = param;
              }

              // Validate referral code format (should be 6 alphanumeric characters)
              if (referralCode && !/^[A-Z0-9]{6}$/i.test(referralCode)) {
                console.log("Invalid referral code format:", referralCode);
                referralCode = null;
              }
            }

            console.log(`Start command from ${telegramId}, referralCode: ${referralCode}`);

          // Check if user exists
          let user = await storage.getUserByTelegramId(telegramId);

          if (!user) {
            // Generate unique 6-digit referral code
            const userReferralCode = await storage.generateUniqueReferralCode();

            // Handle referral processing
            let referredByCode = null;
            let referredById = null;
            let startingPoints = 0;

            if (referralCode && referralCode.length > 0) {
              try {
                console.log("Processing Telegram webhook referral code:", referralCode);

                // Find referrer by referral code
                const referrer = await storage.getUserByReferralCode(referralCode);
                if (referrer) {
                  console.log(`Found referrer: ${referrer.id} with code: ${referrer.referralCode}`);
                  referredByCode = referralCode;
                  referredById = referrer.id;
                  startingPoints = 500; // Welcome bonus
                } else {
                  console.log("Referrer not found with code:", referralCode);
                }
              } catch (e) {
                console.log("Telegram referral lookup failed:", e);
              }
            }

            user = await storage.createUser({
              telegramId,
              username,
              firstName,
              lastName,
              points: startingPoints,
              coinBalance: 0,
              usdBalance: 0,
              egpBalance: 0,
              adsWatchedToday: 0,
              lastAdWatch: null,
              referralCode: userReferralCode,
              referredByCode: referredByCode,
              referredById: referredById
            });

            console.log(`New user created: ${firstName} (${telegramId}), User ID: ${user.id}, Referral Code:${userReferralCode}`);

            //```text

            // Process referral rewards
            if (referredById) {
              try {
                const referrer = await storage.getUser(referredById);
                if (referrer) {
                  // Create referral record
                  await storage.createReferral(referrer.id, user.id);

                  // Give bonus points to referrer
                  await storage.updateUser(referrer.id, {
                    points: referrer.points + 1000
                  });

                  console.log(`Telegram referral processed successfully! Referrer ${referrer.id} got 1000 points, New user ${user.id} got 500 points`);
                }
              } catch (e) {
                console.log("Telegram referral reward processing failed:", e);
              }
            }
          } else {
            console.log(`Existing user: ${firstName} (${telegramId}), User ID: ${user.id}`);
          }

          const webAppUrl = process.env.REPL_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co}`;

          // Send welcome message with inline keyboard
          const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🎉 Welcome ${firstName}!\n\nStart earning points by completing tasks, watching ads, and inviting friends!\n\n💰 Convert your points to real money\n🎯 Complete daily quests for bonus rewards\n👥 Invite friends and earn together`,
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: "🚀 Start Earning Now",
                    web_app: { url: webAppUrl }
                  }
                ]]
              },
              parse_mode: "HTML"
            })
          });

          res.json({ ok: true });
        } else if (message.text === "/help") {
          await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🤖 <b>Bot Commands:</b>\n\n/start - Open the earning app\n/help - Show this help message\n/stats - View your earnings stats\n\n💡 <b>Tip:</b> Use the app button to access all features!`,
              parse_mode: "HTML"
            })
          });
          res.json({ ok: true });
        } else if (message.text === "/stats") {
          const user = await storage.getUserByTelegramId(telegramId);
          if (user) {
            await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `📊 <b>Your Stats:</b>\n\n🎯 Points: ${user.points.toLocaleString()}\n💵 USD Balance: $${(user.usdBalance / 100).toFixed(2)}\n💰 EGP Balance: ₪${(user.egpBalance / 100).toFixed(0)}\n📺 Ads Watched Today: ${user.adsWatchedToday}`,
                parse_mode: "HTML"
              })
            });
          } else {
            await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: "Please use /start first to create your account!"
              })
            });
          }
          res.json({ ok: true });
        } else {
          await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: "Use /start to open the earning app or /help for commands!"
            })
          });
          res.json({ ok: true });
        }
      } else if (callback_query) {
        // Handle callback queries (e.g., button clicks)
        const callbackData = callback_query.data;
        const messageId = callback_query.message.message_id;
        const chatId = callback_query.message.chat.id;
        const telegramId = callback_query.from.id.toString();
    
        if (callbackData === 'my_callback_data') {
            // Process the callback data
            const responseText = 'You clicked a button!';
    
            await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: responseText,
                }),
            });
    
            res.json({ ok: true });
        } else {
            // Handle unknown callback data
            console.log('Unknown callback data:', callbackData);
            res.json({ ok: true }); // Acknowledge the query
        }
    }
     else {
        res.json({ ok: true });
      }
    } catch (error) {
      console.error("Telegram webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Set up Telegram webhook
  app.post("/api/telegram/setup", async (req, res) => {
    try {
      const BOT_TOKEN = process.env.BOT_TOKEN;
      if (!BOT_TOKEN) {
        return res.status(400).json({ message: "Bot token not configured" });
      }

      const webhookUrl = `${req.protocol}://${req.get('host')}/api/telegram/webhook`;
      const webAppUrl = `${req.protocol}://${req.get('host')}`;

      // Set webhook
      const webhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        })
      });

      // Set bot commands
      const commandsResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: "start", description: "🚀 Start earning with TeleEarn" },
            { command: "help", description: "📚 Show help and commands" },
            { command: "stats", description: "📊 View your earnings stats" }
          ]
        })
      });

      // Set menu button (this makes the bot show as a mini app)
      const menuResponse = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: "web_app",
            text: "💰 Open TeleEarn",
            web_app: { url: webAppUrl }
          }
        })
      });

      const webhookResult = await webhookResponse.json();
      const commandsResult = await commandsResponse.json();
      const menuResult = await menuResponse.json();

      res.json({ 
        success: true, 
        webhook: webhookUrl,
        webApp: webAppUrl,
        results: {
          webhook: webhookResult,
          commands: commandsResult,
          menu: menuResult
        }
      });
    } catch (error) {
      console.error("Failed to setup webhook:", error);
      res.status(500).json({ message: "Failed to setup webhook" });
    }
  });

  // Investment routes
  app.get("/api/investments", async (req, res) => {
    try {
      const type = req.query.type as string;
      const packages = await storage.getInvestmentPackages(type);
      res.json({ packages });
    } catch (error) {
      res.status(500).json({ message: "Failed to get investment packages" });
    }
  });

  app.post("/api/investments/subscribe", async (req, res) => {
    try {
      const { userId, packageId } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const packages = await storage.getInvestmentPackages();
      const package_ = packages.find(p => p.id === packageId);

      if (!package_) {
        return res.status(404).json({ message: "Investment package not found" });
      }

      const requiredAmount = package_.price;

      if (package_.type === "points") {
        // For points packages, check the specific currency the package uses
        let updates: any = {};
        let hasEnoughBalance = false;

        if (package_.rewardCurrency === "points") {
          hasEnoughBalance = user.points >= requiredAmount;
          if (hasEnoughBalance) {
            updates.points = user.points - requiredAmount;
          }
        } else if (package_.rewardCurrency === "coin") {
          hasEnoughBalance = user.coinBalance >= requiredAmount;
          if (hasEnoughBalance) {
            updates.coinBalance = user.coinBalance - requiredAmount;
          }
        } else if (package_.rewardCurrency === "usd") {
          const balance = user.investmentUsdBalance || 0;
          hasEnoughBalance = balance >= requiredAmount;
          if (hasEnoughBalance) {
            updates.investmentUsdBalance = balance - requiredAmount;
          }
        } else if (package_.rewardCurrency === "egp") {
          const balance = user.investmentEgpBalance || 0;
          hasEnoughBalance = balance >= requiredAmount;
          if (hasEnoughBalance) {
            updates.investmentEgpBalance = balance - requiredAmount;
          }
        }

        if (!hasEnoughBalance) {
          return res.status(400).json({ message: "Insufficient balance" });
        }

        await storage.updateUser(userId, updates);
      } else {
        // For "own" type, use main wallet balance based on reward currency
        let updates: any = {};
        let hasEnoughBalance = false;

        if (package_.rewardCurrency === "usd") {
          hasEnoughBalance = user.usdBalance >= requiredAmount;
          if (hasEnoughBalance) {
            updates.usdBalance = user.usdBalance - requiredAmount;
          }
        } else if (package_.rewardCurrency === "egp") {
          hasEnoughBalance = user.egpBalance >= requiredAmount;
          if (hasEnoughBalance) {
            updates.egpBalance = user.egpBalance - requiredAmount;
          }
        }

        if (!hasEnoughBalance) {
          return res.status(400).json({ 
            message: "Please deposit money first",
            redirectToDeposit: true 
          });
        }

        await storage.updateUser(userId, updates);
      }

      // Create user investment
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + package_.numberOfDays);

      const investment = await storage.createUserInvestment({
        userId,
        packageId,
        endDate,
        isActive: true,
        tasksCompletedToday: 0,
        lastTaskDate: null
      });

      res.json({ message: "Successfully subscribed to investment package", investment });
    } catch (error) {
      console.error("Investment subscription error:", error);
      res.status(500).json({ message: "Failed to subscribe to investment package" });
    }
  });

  app.get("/api/user/:userId/investments", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const investments = await storage.getUserInvestments(userId);
      res.json({ investments });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user investments" });
    }
  });

  app.post("/api/investments/complete-task", async (req, res) => {
    try {
      const { userId, investmentId } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const investments = await storage.getUserInvestments(userId);
      const investment = investments.find(inv => inv.id === investmentId);

      if (!investment || !investment.isActive) {
        return res.status(404).json({ message: "Investment not found or inactive" });
      }

      // Check if investment is expired
      if (new Date(investment.endDate) <= new Date()) {
        await storage.updateUserInvestment(investmentId, { isActive: false });
        return res.status(400).json({ message: "Investment package has expired" });
      }

      // Check if task already completed today
      const today = new Date().toISOString().split('T')[0];
      const lastTaskDate = investment.lastTaskDate ? investment.lastTaskDate.toISOString().split('T')[0] : null;

      if (lastTaskDate === today) {
        return res.status(400).json({ message: "Task already completed today" });
      }

      // Grant reward
      const reward = investment.package.rewardPerTask;
      const currency = investment.package.rewardCurrency;

      let updates: any = {};
      if (currency === "points") {
        updates.points = user.points + reward;
      } else if (currency === "coin") {
        updates.coinBalance = user.coinBalance + reward;
      } else if (currency === "usd") {
        updates.investmentUsdBalance = (user.investmentUsdBalance || 0) + reward;
      } else if (currency === "egp") {
        updates.investmentEgpBalance = (user.investmentEgpBalance || 0) + reward;
      }

      await storage.updateUser(userId, updates);

      // Update investment task completion
      await storage.updateUserInvestment(investmentId, {
        tasksCompletedToday: investment.tasksCompletedToday + 1,
        lastTaskDate: new Date()
      });

      res.json({ message: "Task completed and reward granted", reward, currency });
    } catch (error) {
      console.error("Investment task completion error:", error);
      res.status(500).json({ message: "Failed to complete investment task" });
    }
  });

  app.post("/api/investments/watch-ad", async (req, res) => {
    try {
      const { userId, investmentId, packageData } = req.body;
      console.log("Processing ad watch:", { userId, investmentId, packageData });

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const investments = await storage.getUserInvestments(userId);
      const investment = investments.find(inv => inv.id === investmentId);

      if (!investment || !investment.isActive) {
        return res.status(404).json({ message: "Investment not found or inactive" });
      }

      // Check if investment is expired
      if (new Date(investment.endDate) <= new Date()) {
        await storage.updateUserInvestment(investmentId, { isActive: false });
        return res.status(400).json({ message: "Investment package has expired" });
      }

      const today = new Date().toISOString().split('T')[0];
      const lastAdDate = investment.lastAdWatch ? investment.lastAdWatch.toISOString().split('T')[0] : null;

      // Reset daily count if it's a new day
      let adsWatchedToday = lastAdDate === today ? (investment.adsWatchedToday || 0) : 0;

      console.log("Ad watching status:", { today, lastAdDate, adsWatchedToday });

      // Check daily limit (10 ads per day)
      if (adsWatchedToday >= 10) {
        return res.status(400).json({ message: "Daily ad limit reached (10/10)" });
      }

      // Calculate reward (10% of package's reward value)
      const reward = Math.floor(packageData.rewardPerTask * 0.1);
      const currency = packageData.rewardCurrency;

      console.log("Calculating reward:", { reward, currency, rewardPerTask: packageData.rewardPerTask });

      // Update user balance based on currency type
      let updates: any = {};
      if (currency === "points") {
        updates.points = user.points + reward;
      } else if (currency === "coin") {
        updates.coinBalance = user.coinBalance + reward;
      } else if (currency === "usd") {
        updates.investmentUsdBalance = (user.investmentUsdBalance || 0) + reward;
      } else if (currency === "egp") {
        updates.investmentEgpBalance = (user.investmentEgpBalance || 0) + reward;
      }

      console.log("User balance updates:", updates);

      // Update user balance
      await storage.updateUser(userId, updates);

      // Update investment ad watching data
      const newAdsWatchedToday = adsWatchedToday + 1;
      await storage.updateUserInvestment(investmentId, {
        adsWatchedToday: newAdsWatchedToday,
        lastAdWatch: new Date()
      });

      console.log("Updated investment ads watched:", { newAdsWatchedToday });

      const adsRemaining = 10 - newAdsWatchedToday;

      res.json({ 
        message: "Ad watched successfully", 
        reward, 
        currency,
        adsRemaining,
        success: true
      });
    } catch (error) {
      console.error("Investment ad watching error:", error);
      res.status(500).json({ message: "Failed to watch ad" });
    }
  });

  // Exchange routes - Add coin conversion
  app.post("/api/exchange/to-coins", async (req, res) => {
    try {
      const { userId, points } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.points < points) {
        return res.status(400).json({ message: "Insufficient points" });
      }

      // Convert points to coins (1:1 ratio for simplicity)
      const coins = points;

      await storage.updateUser(userId, {
        points: user.points - points,
        coinBalance: user.coinBalance + coins
      });

      res.json({ message: "Points converted to coins", coins });
    } catch (error) {
      res.status(500).json({ message: "Failed to convert points to coins" });
    }
  });

  // Investment balance management routes
  app.post("/api/investment/add-balance", async (req, res) => {
    try {
      const { userId, amount, currency } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let updates: any = {};
      if (currency === "usd") {
        updates.investmentUsdBalance = (user.investmentUsdBalance || 0) + amount;
      } else if (currency === "egp") {
        updates.investmentEgpBalance = (user.investmentEgpBalance || 0) + amount;
      } else {
        return res.status(400).json({ message: "Invalid currency" });
      }

      await storage.updateUser(userId, updates);
      res.json({ message: "Investment balance updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update investment balance" });
    }
  });

  app.post("/api/investment/transfer-to-main", async (req, res) => {
    try {
      const { userId, amount, currency } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let updates: any = {};
      if (currency === "usd") {
        if ((user.investmentUsdBalance || 0) < amount) {
          return res.status(400).json({ message: "Insufficient investment USD balance" });
        }
        updates.investmentUsdBalance = (user.investmentUsdBalance || 0) - amount;
        updates.usdBalance = user.usdBalance + amount;
      } else if (currency === "egp") {
        if ((user.investmentEgpBalance || 0) < amount) {
          return res.status(400).json({ message: "Insufficient investment EGP balance" });
        }
        updates.investmentEgpBalance = (user.investmentEgpBalance || 0) - amount;
        updates.egpBalance = user.egpBalance + amount;
      } else {
        return res.status(400).json({ message: "Invalid currency" });
      }

      await storage.updateUser(userId, updates);
      res.json({ message: "Amount transferred to main balance successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to transfer to main balance" });
    }
  });

  // Admin Routes (Protected - would need authentication in production)

  // Quest Management
  app.post("/api/admin/quests", async (req, res) => {
    try {
      const questData = insertQuestSchema.parse(req.body);
      const quest = await storage.createQuest(questData);
      res.json({ quest });
    } catch (error) {
      res.status(400).json({ message: "Invalid quest data" });
    }
  });

  app.put("/api/admin/quests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const quest = await storage.updateQuest(id, updates);
      if (!quest) {
        return res.status(404).json({ message: "Quest not found" });
      }
      res.json({ quest });
    } catch (error) {
      res.status(500).json({ message: "Failed to update quest" });
    }
  });

  app.delete("/api/admin/quests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteQuest(id);
      if (!deleted) {
        return res.status(404).json({ message: "Quest not found" });
      }
      res.json({ message: "Quest deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete quest" });
    }
  });

  // Fix broken quests (with target = 0)
  app.post("/api/admin/quests/fix-broken", async (req, res) => {
    try {
      const quests = await storage.getQuests();
      const brokenQuests = quests.filter(q => q.target === 0);

      let fixed = 0;
      for (const quest of brokenQuests) {
        // Set reasonable targets based on quest type
        let newTarget = 1;
        if (quest.type === "watch_ads") newTarget = 5;
        else if (quest.type === "invite_friends") newTarget = 3;
        else if (quest.type === "complete_tasks") newTarget = 2;

        await storage.updateQuest(quest.id, { target: newTarget });
        fixed++;
      }

      res.json({ message: `Fixed ${fixed} broken quests`, fixed });
    } catch (error) {
      console.error("Failed to fix broken quests:", error);
      res.status(500).json({ message: "Failed to fix broken quests" });
    }
  });

  // Deposit Methods Management
  app.get("/api/admin/deposit-methods", async (req, res) => {
    try {
      const methods = await storage.getDepositMethods();
      res.json({ methods });
    } catch (error) {
      console.error("Failed to get deposit methods:", error);
      res.status(500).json({ message: "Failed to get deposit methods", error: error.message });
    }
  });

  app.post("/api/admin/deposit-methods", async (req, res) => {
    try {
      console.log("Received deposit method data:", req.body);
      const methodData = insertDepositMethodSchema.parse(req.body);
      console.log("Validated deposit method data:", methodData);
      const method = await storage.createDepositMethod(methodData);
      res.json({ method });
    } catch (error) {
      console.error("Failed to create deposit method:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid deposit method data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create deposit method", error: error.message });
      }
    }
  });

  app.put("/api/admin/deposit-methods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const method = await storage.updateDepositMethod(id, updates);
      if (!method) {
        return res.status(404).json({ message: "Deposit method not found" });
      }
      res.json({ method });
    } catch (error) {
      res.status(500).json({ message: "Failed to update deposit method" });
    }
  });

  app.delete("/api/admin/deposit-methods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDepositMethod(id);
      if (!deleted) {
        return res.status(404).json({ message: "Deposit method not found" });
      }
      res.json({ message: "Deposit method deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete deposit method" });
    }
  });

  // Withdrawal Methods Management
  app.get("/api/admin/withdrawal-methods", async (req, res) => {
    try {
      const methods = await storage.getWithdrawalMethods();
      res.json({ methods });
    } catch (error) {
      res.status(500).json({ message: "Failed to get withdrawal methods" });
    }
  });

  app.post("/api/admin/withdrawal-methods", async (req, res) => {
    try {
      const methodData = insertWithdrawalMethodSchema.parse(req.body);
      const method = await storage.createWithdrawalMethod(methodData);
      res.json({ method });
    } catch (error) {
      res.status(400).json({ message: "Invalid withdrawal method data" });
    }
  });

  app.put("/api/admin/withdrawal-methods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const method = await storage.updateWithdrawalMethod(id, updates);
      if (!method) {
        return res.status(404).json({ message: "Withdrawal method not found" });
      }
      res.json({ method });
    } catch (error) {
      res.status(500).json({ message: "Failed to update withdrawal method" });
    }
  });

  app.delete("/api/admin/withdrawal-methods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteWithdrawalMethod(id);
      if (!deleted) {
        return res.status(404).json({ message: "Withdrawal method not found" });
      }
      res.json({ message: "Withdrawal method deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete withdrawal method" });
    }
  });

  // Exchange Rates Management
  app.get("/api/admin/exchange-rates", async (req, res) => {
    try {
      const rates = await storage.getExchangeRates();
      res.json({ rates });
    } catch (error) {
      res.status(500).json({ message: "Failed to get exchange rates" });
    }
  });

  app.post("/api/admin/exchange-rates", async (req, res) => {
    try {
      const rateData = {
        ...req.body,
        rate: req.body.rate.toString() // Convert to string
      };
      const validatedData = insertExchangeRateSchema.parse(rateData);
      const rate = await storage.createExchangeRate(validatedData);
      res.json({ rate });
    } catch (error) {
      console.error("Exchange rate creation error:", error);
      res.status(400).json({ message: "Invalid exchange rate data", error: error.message });
    }
  });

  app.put("/api/admin/exchange-rates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const rate = await storage.updateExchangeRate(id, updates);
      if (!rate) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }
      res.json({ rate });
    } catch (error) {
      res.status(500).json({ message: "Failed to update exchange rate" });
    }
  });

  app.delete("/api/admin/exchange-rates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteExchangeRate(id);
      if (!deleted) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }
      res.json({ message: "Exchange rate deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete exchange rate" });
    }
  });

  // Deposit Methods Routes (for frontend)
  app.get("/api/deposit-methods", async (req, res) => {
    try {
      const methods = await storage.getDepositMethods();
      res.json({ methods });
    } catch (error) {
      console.error("Failed to get deposit methods:", error);
      res.status(500).json({ message: "Failed to get deposit methods", error: error.message });
    }
  });

  // Deposit Management Routes
  app.get("/api/deposits", async (req, res) => {
    try {
      const requests = await storage.getDepositRequests();
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ message: "Failed to get deposit requests" });
    }
  });

  app.get("/api/deposits/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requests = await storage.getUserDepositRequests(userId);
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user deposit requests" });
    }
  });

  app.post("/api/deposits", async (req, res) => {
    try {
      const requestData = insertDepositRequestSchema.parse(req.body);
      // Default to investment type for new deposits
      if (!requestData.depositType) {
        requestData.depositType = "investment";
      }
      const request = await storage.createDepositRequest(requestData);
      res.json({ request });
    } catch (error) {
      res.status(400).json({ message: "Invalid deposit request data" });
    }
  });

  // Admin - Approve deposit request
  app.post("/api/admin/deposits/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getDepositRequestById(id);

      if (!request) {
        return res.status(404).json({ message: "Deposit request not found" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
      }

      // Get user to add the deposit amount
      const user = await storage.getUser(request.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Add amount to appropriate balance based on deposit type
      let updates: any = {};
      if (request.depositType === "main") {
        if (request.currency === "usd") {
          updates.usdBalance = user.usdBalance + request.amount;
        } else if (request.currency === "egp") {
          updates.egpBalance = user.egpBalance + request.amount;
        }
      } else if (request.depositType === "investment") {
        if (request.currency === "usd") {
          updates.investmentUsdBalance = (user.investmentUsdBalance || 0) + request.amount;
        } else if (request.currency === "egp") {
          updates.investmentEgpBalance = (user.investmentEgpBalance || 0) + request.amount;
        }
      }

      // Update user balance and request status
      await storage.updateUser(user.id, updates);
      await storage.updateDepositRequestStatus(id, "approved");

      res.json({ message: "Deposit request approved and balance updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve deposit request" });
    }
  });

  // Admin - Reject deposit request
  app.post("/api/admin/deposits/:id/reject", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getDepositRequestById(id);

      if (!request) {
        return res.status(404).json({ message: "Deposit request not found" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
      }

      // Update request status to rejected
      await storage.updateDepositRequestStatus(id, "rejected");

      res.json({ message: "Deposit request rejected" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reject deposit request" });
    }
  });

  // Investment Package Management
  app.get("/api/admin/investment-packages", async (req, res) => {
    try {
      const packages = await storage.getInvestmentPackages();
      res.json({ packages });
    } catch (error) {
      res.status(500).json({ message: "Failed to get investment packages" });
    }
  });

  app.post("/api/admin/investment-packages", async (req, res) => {
    try {
      console.log("Creating investment package with data:", req.body);
      const packageData = insertInvestmentPackageSchema.parse(req.body);
      console.log("Validated package data:", packageData);
      const package_ = await storage.createInvestmentPackage(packageData);
      console.log("Created package:", package_);
      res.json({ package: package_ });
    } catch (error) {
      console.error("Investment package creation error:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid investment package data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create investment package", error: error.message });
      }
    }
  });

  app.put("/api/admin/investment-packages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const package_ = await storage.updateInvestmentPackage(id, updates);
      if (!package_) {
        return res.status(404).json({ message: "Investment package not found" });
      }
      res.json({ package: package_ });
    } catch (error) {
      res.status(500).json({ message: "Failed to update investment package" });
    }
  });

  app.delete("/api/admin/investment-packages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteInvestmentPackage(id);
      if (!deleted) {
        return res.status(404).json({ message: "Investment package not found" });
      }
      res.json({ message: "Investment package deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete investment package" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}