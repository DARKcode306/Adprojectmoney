import { storage } from "./storage";

export class TelegramBot {
  private BOT_TOKEN = process.env.BOT_TOKEN;
  private baseUrl = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

  async setWebhook() {
    if (!this.BOT_TOKEN) {
      console.error("❌ BOT_TOKEN is missing");
      return { ok: false, description: "Bot token not configured" };
    }

    try {
      const replSlug = process.env.REPL_SLUG;
      const replOwner = process.env.REPL_OWNER;
      const webhookUrl = process.env.REPL_URL || `https://${replSlug}.${replOwner}.repl.co/api/telegram/webhook`;
      const webAppUrl = this.getWebAppUrl();

      // Set webhook
      const webhookResponse = await fetch(`${this.baseUrl}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query"]
        })
      });

      // Set bot commands
      await fetch(`${this.baseUrl}/setMyCommands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commands: [
            { command: "start", description: "🚀 Start earning with TeleEarn" },
            { command: "help", description: "📚 Show help and commands" },
            { command: "stats", description: "📊 View your earnings stats" }
          ]
        })
      });

      // Set floating web_app button
      await fetch(`${this.baseUrl}/setChatMenuButton`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_button: {
            type: "web_app",
            text: "💰 Open TeleEarn",
            web_app: { url: webAppUrl }
          }
        })
      });

      const result = await webhookResponse.json();
      if (result.ok) {
        console.log(`✅ Webhook set: ${webhookUrl}`);
        console.log(`📱 WebApp URL: ${webAppUrl}`);
        console.log(`🎯 Menu Button set`);
      } else {
        console.error("❌ Webhook error:", result.description);
      }

      return result;
    } catch (error: any) {
      console.error("❌ setWebhook error:", error.message);
      return { ok: false, description: error.message };
    }
  }

  async sendMessage(chatId: string, text: string, replyMarkup?: any) {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          reply_markup: replyMarkup,
          parse_mode: "HTML"
        })
      });

      return await response.json();
    } catch (error: any) {
      console.error("❌ sendMessage error:", error.message);
    }
  }

  getWebAppUrl(referralCode?: string) {
    const replSlug = process.env.REPL_SLUG;
    const replOwner = process.env.REPL_OWNER;
    const base = process.env.REPL_URL || `https://${replSlug}.${replOwner}.repl.co`;
    return referralCode ? `${base}?startapp=r_${referralCode}` : `${base}`;
  }

  getBotReferralUrl(referralCode: string) {
    return `https://t.me/Eg_Token_bot/app?startapp=r_${referralCode}`;
  }

  createWebAppKeyboard(referralId?: string) {
    return {
      inline_keyboard: [[
        {
          text: "🚀 Open App",
          web_app: { url: this.getWebAppUrl(referralId) }
        }
      ]]
    };
  }

  async handleStartCommand(chatId: string, userId: string) {
    const welcomeText = `
<b>Welcome to TeleEarn!</b>

Earn points by completing tasks and exchange them for real money.

📌 If you were invited, your friend earns bonus points once you complete your first task.
    `;

    const replyMarkup = {
      inline_keyboard: [[
        {
          text: "🚀 Start Earning Now",
          web_app: { url: this.getWebAppUrl(userId) }
        }
      ]]
    };

    return this.sendMessage(chatId, welcomeText, replyMarkup);
  }
}

export const telegramBot = new TelegramBot();