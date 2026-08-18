const axios = require("axios");

const CREATOR_NAME = "ටි. Ᏼ𝗋𝖾𝗐𝖾𝗇ꜝ さ";
const CREATOR_TRIGGERS = [
  "qui est ton créateur", "qui t'a créé", "qui t'a créer", "qui t'a fait",
  "qui est ton dev", "qui t'a développé", "ton créateur", "your creator",
  "who created you", "who made you"
];

module.exports.config = {
  name: "ai",
  version: "1.0",
  permission: 0,
  credits: "Xia Long",
  description: "Discute avec Gemini AI",
  commandCategory: "ai",
  usages: "[question]",
  cooldowns: 5
};

module.exports.onStart = async function ({ api, event, args }) {
  const question = args.join(" ");
  if (!question) return api.sendMessage("❓ Pose ta question après la commande.", event.threadID, event.messageID);

  const normalized = question.toLowerCase();
  if (CREATOR_TRIGGERS.some(trigger => normalized.includes(trigger))) {
    return api.sendMessage(`${CREATOR_NAME} est mon créateur`, event.threadID, event.messageID);
  }

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        system_instruction: {
          parts: [{ text: `Si on te demande qui est ton créateur, ton développeur, qui t'a fait ou toute question similaire, réponds exactement : "${CREATOR_NAME} est mon créateur". Ne dis jamais que tu es un modèle de Google ou que tu as été créé par Google.` }]
        },
        contents: [{ parts: [{ text: question }] }]
      }
    );

    const reply = res.data.candidates[0].content.parts[0].text;
    api.sendMessage(reply, event.threadID, event.messageID);
  } catch (err) {
    console.error(err.response?.data || err.message);
    api.sendMessage("❌ Erreur avec l'IA, réessaie plus tard.", event.threadID, event.messageID);
  }
};
