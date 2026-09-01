module.exports = {
  config: {
    name: 'kickall',
    version: '1.0',
    author: 'Jordan',
    countDown: 10, // 10s de cooldown pour éviter le spam
    role: 1, // 1 = Admin du groupe seulement
    shortDescription: 'Expulser tous les membres du groupe',
    category: '👑 Admin',
    guide: { 
      fr: '{pn}\nAttention: Expulse tous les membres non-admin du groupe' 
    }
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, senderID } = event;
    
    // Confirmation pour éviter les erreurs
    return message.reply(
      "➤『𝗝𝗢𝗥𝗗𝗔𝗡 𝗕𝗢𝗧 』☜ヅ\n\n" +
      "Tu es sûr de vouloir expulser TOUS les membres du groupe ?\n" +
      "Réponds `oui` à ce message pour confirmer.\n\n" +
      "Annulation dans 30 secondes.",
      (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: 'kickall',
          messageID: info.messageID,
          author: senderID,
          threadID
        });
        
        // Auto-supprime la confirmation après 30s
        setTimeout(() => {
          global.GoatBot.onReply.delete(info.messageID);
        }, 30000);
      }
    );
  },

  onReply: async function ({ api, event, Reply, message }) {
    const { body, senderID, threadID } = event;
    
    if (senderID !== Reply.author) return;
    if (body.toLowerCase() !== 'oui') return message.reply("❌ Annulé.");

    message.reply("⏳ Expulsion en cours... Ça peut prendre du temps.");

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const participants = threadInfo.participantIDs;
      const botID = api.getCurrentUserID();
      const adminIDs = threadInfo.adminIDs.map(a => a.id);

      // On garde: le bot + les admins
      const toKick = participants.filter(uid => 
        uid !== botID && !adminIDs.includes(uid)
      );

      if (toKick.length === 0) return message.reply("✅ Il n'y a personne à expulser.");

      let success = 0;
      let failed = 0;

      for (const uid of toKick) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s entre chaque kick pour éviter le ban
          await api.removeUserFromGroup(uid, threadID);
          success++;
        } catch (e) {
          failed++;
        }
      }

      return message.reply(
        `➤『𝗝𝗢𝗥𝗗𝗔𝗡 𝗕𝗢𝗧 』☜ヅ\n\n` +
        `✅ Expulsion terminée\n` +
        `Réussi: ${success}\n` +
        `Échec: ${failed}\n\n` +
        `Note: Facebook peut bloquer si trop de kicks d'un coup.`
      );

    } catch (error) {
      return message.reply("❌ Erreur: Impossible de récupérer la liste des membres.");
    }
  }
};
