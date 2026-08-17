const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "prefix",
    aliases: [],
    version: "1.4",
    author: "Christus",
    countDown: 10,
    role: 0,
    description: {
      en: "Change the bot prefix in this chat or globally"
    },
    category: "system",
    guide: {
      en: "👋 Need help with prefixes? Here's what I can do:\n" +
          "╰‣ Type: {pn} <newPrefix>\n" +
          "   ↪ Set a new prefix for this chat only\n" +
          "   ↪ Example: {pn} $\n" +
          "╰‣ Type: {pn} <newPrefix> -g\n" +
          "   ↪ Set a new global prefix (admin only)\n" +
          "   ↪ Example: {pn} ! -g\n" +
          "╰‣ Type: {pn} reset\n" +
          "   ↪ Reset to default prefix from config\n" +
          "╰‣ Type: {pn} refresh\n" +
          "   ↪ Refresh prefix cache for this chat\n" +
          "╰‣ Just type: prefix\n" +
          "   ↪ Shows current prefix info\n" +
          "🤖 I'm ➤『𝗝𝗢𝗥𝗗𝗔𝗡 𝗕𝗢𝗧 』☜ヅ, ready to help!"
    }
  },

  onStart: async function ({ message, role, args, commandName, event, threadsData, usersData }) {
    const globalPrefix = global.GoatBot.config.prefix;
    const userName = await usersData.getName(event.senderID) || "there";

    if (!args[0]) {
      const threadPrefix = await threadsData.get(event.threadID, "data.prefix") || globalPrefix;
      return message.reply({
        body: `👋 Hey ${userName}, did you ask for my prefix?\n` +
          `╭‣ 🌐 Global: ${globalPrefix}\n` +
          `╰‣ 💬 This Chat: ${threadPrefix}\n` +
          `🤖 I'm ➤『𝗝𝗢𝗥𝗗𝗔𝗡 𝗕𝗢𝗧 』☜ヅ\n📂 try "${threadPrefix}help" to see all commands.`,
        mentions: [{ id: event.senderID, tag: userName }]
      });
    }

    if (args[0] === "reset") {
      await threadsData.set(event.threadID, null, "data.prefix");
      return message.reply({
        body: `✅ Hey ${userName}, chat prefix has been reset!\n` +
          `╭‣ 🌐 Global: ${globalPrefix}\n` +
          `╰‣ 💬 This Chat: ${globalPrefix}\n` +
          `🤖 I'm ➤『𝗝𝗢𝗥𝗗𝗔𝗡 𝗕𝗢𝗧 』☜ヅ\n📂 try "${globalPrefix}help" to see all commands.`,
        mentions: [{ id: event.senderID, tag: userName }]
      });
    }

    if (args[0] === "refresh") {
      try {
        const threadID = event.threadID;
        if (threadsData.cache && threadsData.cache[threadID]) {
          delete threadsData.cache[threadID].data?.prefix;
        }
        const refreshedPrefix = await threadsData.get(threadID, "data.prefix") || globalPrefix;
        return message.reply({
          body: `🔄 Hey ${userName}, prefix cache has been refreshed!\n` +
            `╭‣ 🌐 Global: ${globalPrefix}\n` +
            `╰‣ 💬 This Chat: ${refreshedPrefix}\n` +
            `🤖 I'm ➤『𝗝𝗢𝗥𝗗𝗔𝗡 𝗕𝗢𝗧 』☜ヅ\n📂 try "${refreshedPrefix}help" to see all commands.`,
          mentions: [{ id: event.senderID, tag: userName }]
        });
      } catch (error) {
        return message.reply({
          body: `❌ Hey ${userName}, I couldn't refresh the prefix!`,
          mentions: [{ id: event.senderID, tag: userName }]
        });
      }
    }

    const newPrefix = args[0];
    const setGlobal = args[1] === "-g";

    if (setGlobal && role < 2) {
      return message.reply({
        body: `⛔ Hey ${userName}, Admin privileges required for global change!`,
        mentions: [{ id: event.senderID, tag: userName }]
      });
    }

    const currentPrefix = await threadsData.get(event.threadID, "data.prefix") || globalPrefix;
    const confirmMessage = setGlobal
      ? `⚙️ Hey ${userName}, confirm global prefix change?\n╭‣ Current: ${globalPrefix}\n╰‣ New: ${newPrefix}\n🤖 React to confirm!`
      : `⚙️ Hey ${userName}, confirm chat prefix change?\n╭‣ Current: ${currentPrefix}\n╰‣ New: ${newPrefix}\n🤖 React to confirm!`;

    return message.reply(confirmMessage, (err, info) => {
      if (err) return;
      global.GoatBot.onReaction.set(info.messageID, {
        author: event.senderID,
        newPrefix,
        setGlobal,
        commandName
      });
    });
  },

  onReaction: async function ({ message, event, Reaction, threadsData, usersData }) {
    const { author, newPrefix, setGlobal } = Reaction;
    if (event.userID !== author) return;
    const userName = await usersData.getName(event.userID) || "there";

    if (setGlobal) {
      try {
        global.GoatBot.config.prefix = newPrefix;
        const configPath = global.client.dirConfig || path.join(process.cwd(), "config.json");
        fs.writeFileSync(configPath, JSON.stringify(global.GoatBot.config, null, 2));
        return message.reply({
          body: `✅ Hey ${userName}, global prefix updated to: ${newPrefix}`,
          mentions: [{ id: event.userID, tag: userName }]
        });
      } catch (error) {
        return message.reply(`❌ Failed to save global prefix config.`);
      }
    }

    try {
      await threadsData.set(event.threadID, newPrefix, "data.prefix");
      return message.reply({
        body: `✅ Hey ${userName}, chat prefix updated to: ${newPrefix}`,
        mentions: [{ id: event.userID, tag: userName }]
      });
    } catch (error) {
      return message.reply(`❌ Database error while saving chat prefix.`);
    }
  },

  onChat: async function ({ event, message, threadsData, usersData }) {
    const triggerText = event.body?.toLowerCase().trim();
    if (!triggerText) return;
    const isTrigger = triggerText === "prefix" || triggerText === "ňč" || triggerText === "nøøbcore";
    if (!isTrigger) return;

    const userName = await usersData.getName(event.senderID) || "there";
    const globalPrefix = global.GoatBot.config.prefix;
    const threadPrefix = await threadsData.get(event.threadID, "data.prefix") || globalPrefix;

    return message.reply({
      body: `👋 Hey ${userName}, did you ask for my prefix?\n` +
        `╭‣ 🌐 Global: ${globalPrefix}\n` +
        `╰‣ 💬 This Chat: ${threadPrefix}\n` +
        `🤖 I'm ➤『𝗝𝗢𝗥𝗗𝗔𝗡 𝗕𝗢𝗧 』☜ヅ\n📂 try "${threadPrefix}help" to see all commands.`,
      mentions: [{ id: event.senderID, tag: userName }]
    });
  }
};
  
