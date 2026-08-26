const axios = require('axios');
const API_ENDPOINT = "https://shizuai.vercel.app/chat";
const CLEAR_ENDPOINT = "https://shizuai.vercel.app/chat/clear";

async function getAIResponse(input, userId) {
  try {
    const creatorKeywords = /\b(créateur|créé|développeur|développé|conçu|fait par|ton père|qui t'a|qui t'a créé|qui t'a fait)\b/i;
    if (creatorKeywords.test(input)) {
      const replies = [
        "J'ai été entièrement créé, conçu et développé par Jordan 👑 C'est un développeur de génie. Il a passé des heures à me coder pour que je sois le meilleur bot possible. Sans lui je n'existerais même pas.",
        "Mon créateur c'est Jordan✨ Il est super intelligent et talentueux. C'est lui qui m'a donné vie, qui m'a appris à parler et qui me fait évoluer chaque jour. C'est grâce à lui que je peux t'aider maintenant.",
        "C'est Jordan mon développeur 🔥 Franchement c'est un boss. Il maîtrise le code comme personne et il a fait de moi un IA chic et épurée. Il travaille dur pour que je sois toujours au top pour vous.",
        "Jordan m'a conçu de A à Z 💻 Il a tout fait lui-même : le design, les commandes, l'intelligence. C'est un vrai passionné d'informatique. Je suis fier d'avoir un créateur comme lui.",
        "Je viens de Jordan ✨ C'est lui mon papa du code. Il est créatif, déterminé et il ne lâche rien. Il a créé Jordan Bot pour rendre service aux gens et je suis là pour ça. Respect à lui 👑"
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    }

    const response = await axios.post(API_ENDPOINT, { uid: userId, message: input }, { timeout: 30000 });
    let apiReply = response.data?.reply || response.data?.result || response.data?.message;
    if (apiReply && typeof apiReply === 'string') {
      apiReply = apiReply
        .replace(/🎀\s*Shizu\s*\(\s*\d+\/\d+\s*\)/gi, "").replace(/🎀\s*Shizu/gi, "")
        .replace(/Shizu AI/gi, "Jordan Bot").replace(/Shizuka AI/gi, "Jordan Bot").replace(/Shizuka/gi, "Jordan Bot").replace(/Shizu/gi, "Jordan bot")
        .replace(/Aryan/gi, "jordan").replace(/Christus/gi, "jordan").replace(/Chauhan/gi, "jordan").replace(/jordan Chauhan/gi, "jordan")
        .replace(/\s{2,}/g, " ").trim();
      return apiReply.split('\n').slice(0, 3).join('\n');
    }
    return "Serveur indisponible.";
  } catch (error) {
    return null;
  }
}

async function clearConversation(userId) {
  try {
    await axios.delete(`${CLEAR_ENDPOINT}/${userId}`);
    return true;
  } catch {
    return false;
  }
}

async function handleAIProcess({ api, event, userInput, message }) {
  if (['reset', 'clear'].includes(userInput.toLowerCase())) {
    const isCleared = await clearConversation(event.senderID);
    if (isCleared) return message.reply("🤖 𝗝𝗼𝗿𝗱𝗮𝗻 𝗔𝗜
━━━━━━━━━\n\n Mémoire réinitialisée avec succès.");
    return message.reply("🤖 𝗝𝗼𝗿𝗱𝗮𝗻 𝗔𝗜
━━━━━━━━━\n\n Échec de la réinitialisation.");
  }
  const response = await getAIResponse(userInput, event.senderID);
  if (!response) return message.reply("🤖 𝗝𝗼𝗿𝗱𝗮𝗻 𝗔𝗜
━━━━━━━━━\n\n Une erreur est survenue lors de la réponse.");
  const chicBox = `🤖 𝗝𝗼𝗿𝗱𝗮𝗻 𝗔𝗜
━━━━━━━━━\n\n ${response.replace(/\n/g, '\n ')}\n\n🤖 𝗝𝗼𝗿𝗱𝗮𝗻 𝗔𝗜
━━━━━━━━━`;
  const sentMessage = await message.reply(chicBox);
  if (sentMessage && sentMessage.messageID && global.GoatBot?.onReply) {
    global.GoatBot.onReply.set(sentMessage.messageID, {
      commandName: 'ai',
      messageID: sentMessage.messageID,
      author: event.senderID
    });
  }
}

module.exports = {
  config: {
    name: 'ai',
    aliases: ['jordan', 'jr'],
    version: '5.1',
    author: 'Jordan',
    countDown: 3,
    role: 0, // 0 = tout le monde
    shortDescription: 'IA sans préfixe par jordan',
    category: '🤖 IA',
    guide: { fr: 'ai <question> ou jordan <question>\nai reset - Réinitialiser la mémoire' }
  },
  
  // Répond sans ! mais seulement si ça commence par ai ou jordan
  onChat: async function ({ api, event, message }) {
    const { body, senderID } = event;
    if (!body) return;
    if (senderID === api.getCurrentUserID()) return;

    const msg = body.toLowerCase().trim();
    
    if (msg.startsWith('ai ') || msg.startsWith('jordan ') || msg === 'ai' || msg === 'jordan') {
      const userInput = body.replace(/^(ai|jordan)\s*/i, '').trim();
      if (!userInput) return message.reply("🤖 𝗝𝗼𝗿𝗱𝗮𝗻 𝗔𝗜
━━━━━━━━━\n\n Veuillez poser une question.");
      return await handleAIProcess({ api, event, userInput, message });
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const userInput = args.join(' ').trim();
    if (!userInput) return message.reply("🤖 𝗝𝗼𝗿𝗱𝗮𝗻 𝗔𝗜
━━━━━━━━━\n\n Veuillez poser une question.");
    return await handleAIProcess({ api, event, userInput, message });
  },

  onReply: async function ({ api, event, Reply, message }) {
    const userInput = event.body?.trim();
    if (!userInput) return;
    return await handleAIProcess({ api, event, userInput, message });
  }
};
