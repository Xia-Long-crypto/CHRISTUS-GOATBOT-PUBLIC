const fs = require("fs-extra");
const path = require("path");

const pathData = path.join(__dirname, "cache", "activeMembers.json");

function loadData() {
  try {
    if (!fs.existsSync(pathData)) {
      fs.ensureFileSync(pathData);
      fs.writeFileSync(pathData, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(pathData, "utf8"));
  } catch (e) {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(pathData, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "kickinactive",
  version: "1.0",
  author: "Jordan Bot",
  countDown: 10,
  role: 2, // 2 = admin du bot uniquement
  description: {
    fr: "Supprime les membres qui n'ont jamais écrit dans le groupe"
  },
  category: "admin",
  guide: {
    fr: "   {pn}: supprime les membres inactifs.\n   {pn} dry: affiche juste la liste sans supprimer."
  }
};

// Tourne sur CHAQUE message pour enregistrer qui est actif dans le groupe
module.exports.onChat = async function ({ event }) {
  const { threadID, senderID } = event;
  if (!threadID || !senderID) return;
  const data = loadData();
  if (!data[threadID]) data[threadID] = [];
  if (!data[threadID].includes(senderID)) {
    data[threadID].push(senderID);
    saveData(data);
  }
};

module.exports.onStart = async function ({ api, event, args }) {
  const { threadID } = event;

  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const participantIDs = threadInfo.participantIDs;
    const adminIDs = threadInfo.adminIDs.map(a => a.id || a);
    const botID = api.getCurrentUserID();
    const botAdmins = global.GoatBot?.config?.adminBot || [];

    const data = loadData();
    const activeUsers = data[threadID] || [];

    const inactiveUsers = participantIDs.filter(id =>
      !activeUsers.includes(id) &&
      id !== botID &&
      !adminIDs.includes(id) &&
      !botAdmins.includes(id)
    );

    if (inactiveUsers.length === 0) {
      return api.sendMessage("✅ Aucun membre inactif trouvé.", threadID);
    }

    if (args[0] === "dry") {
      const userInfo = await api.getUserInfo(inactiveUsers);
      let msg = `📋 ${inactiveUsers.length} membre(s) inactif(s) :\n\n`;
      for (const id of inactiveUsers) msg += `- ${userInfo[id]?.name || id}\n`;
      msg += `\n➡️ Tape "kickinactive" (sans "dry") pour les supprimer.`;
      return api.sendMessage(msg, threadID);
    }

    api.sendMessage(`⏳ Suppression de ${inactiveUsers.length} membre(s)...`, threadID);

    let success = 0, failed = 0;
    for (const id of inactiveUsers) {
      try {
        await api.removeUserFromGroup(id, threadID);
        success++;
        await new Promise(r => setTimeout(r, 1500)); // anti rate-limit
      } catch (e) {
        failed++;
      }
    }

    api.sendMessage(`✅ Terminé.\n- Supprimés: ${success}\n- Échecs: ${failed}`, threadID);

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Erreur: " + err.message, threadID);
  }
};
