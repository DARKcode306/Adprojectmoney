import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { telegramBot } from "./telegram-bot";

// Load environment variables
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not available, using system environment variables');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Debug environment variables
  console.log("🔍 Environment check:");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("BOT_TOKEN present:", !!process.env.BOT_TOKEN);

  // Check if bot token is available
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    console.warn("⚠️  TELEGRAM_BOT_TOKEN not found in environment variables");
    console.log("📝 The app will still work, but Telegram bot features will be disabled");
  } else {
    console.log("✅ Telegram bot token configured");
    console.log("🤖 Bot token starts with:", botToken.substring(0, 10) + "...");
  }

  const server = await registerRoutes(app);

  // Auto-setup Telegram bot if token is available
  if (botToken) {
    try {
      const webAppUrl = process.env.REPL_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const webhookUrl = `${webAppUrl}/api/telegram/webhook`;

      console.log("🔄 Setting up Telegram bot...");

      // Set webhook
      const webhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        })
      });

      // Set bot commands
      await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
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
      await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
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
      if (webhookResult.ok) {
        console.log("✅ Telegram bot configured successfully");
        console.log("🌐 Webhook URL:", webhookUrl);
        console.log("📱 Web App URL:", webAppUrl);
      } else {
        console.error("❌ Failed to set webhook:", webhookResult.description);
      }
    } catch (error) {
      console.error("❌ Failed to configure Telegram bot:", error);
    }
  }



  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Initialize Telegram bot
  if (process.env.BOT_TOKEN) {
    console.log('🤖 Initializing Telegram Bot...');
    try {
      const result = await telegramBot.setWebhook();
      if (result.ok) {
        console.log('✅ Bot webhook set successfully');
      } else {
        console.error('❌ Failed to set webhook:', result.description);
      }
    } catch (error) {
      console.error('❌ Bot initialization failed:', error);
    }
  }
})();
