const fs = require("fs-extra");
const path = require("path");

let fonts;
try {
  fonts = require('../../func/font.js');
} catch (error) {
  fonts = { bold: (t) => t, monospace: (t) => t, sansSerif: (t) => t };
}

function formatMoney(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return "0$";
  amount = Number(amount);
  if (amount === Infinity) return "∞$";
  if (amount === -Infinity) return "-∞$";
  if (!isFinite(amount)) return "NaN$";
  const scales = [
    { value: 1e18, suffix: "Qi" },
    { value: 1e15, suffix: "Qa" },
    { value: 1e12, suffix: "T" },
    { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" },
    { value: 1e3, suffix: "K" }
  ];
  const scale = scales.find(s => Math.abs(amount) >= s.value);
  if (scale) {
    const scaled = (amount / scale.value).toFixed(2);
    const clean = scaled.endsWith(".00") ? scaled.slice(0, -3) : scaled;
    return `${amount < 0 ? "-" : ""}${clean}${scale.suffix}$`;
  }
  return `${amount.toLocaleString("en-US")}$`;
}

const SUFFIXES = { k: 1e3, m: 1e6, b: 1e9, t: 1e12, q: 1e15, Q: 1e18 };
function parseAmount(input) {
  if (!input || typeof input !== "string") return NaN;
  const m = input.trim().toLowerCase().match(/^([\d,.]+)\s*([kmbtq]?)$/i);
  if (!m) return NaN;
  let v = parseFloat(m[1].replace(/,/g, "."));
  if (m[2] && SUFFIXES[m[2]]) v *= SUFFIXES[m[2]];
  return isNaN(v) ? NaN : Math.floor(v);
}

const ADMIN_UIDS = ["61592645646617"];

module.exports = {
  config: {
    name: "setmoney",
    aliases: [],
    version: "2.3",
    author: "Christus",
    role: 2,
    description: {
      fr: "🔧 Modifier les données d'un utilisateur (argent, XP, variables personnalisées) – réservé aux administrateurs"
    },
    category: "admin",
    guide: {
      fr: `${fonts.sansSerif("✨ COMMANDE ADMIN ✨")}\n` +
           `${fonts.bold("{pn} money <montant> [@user|uid]")} : définir l'argent d'un utilisateur\n` +
           `${fonts.bold("{pn} money all <montant>")} : même montant pour TOUS les utilisateurs\n` +
           `${fonts.bold("{pn} money reset")} : remettre à 0 les 10 premiers du top\n` +
           `${fonts.bold("{pn} exp <valeur> [@user|uid]")} : définir l'XP\n` +
           `${fonts.bold("{pn} custom <variable> <valeur> [@user|uid]")} : variable personnalisée\n\n` +
           `${fonts.bold("💡 Exemples :")}\n` +
           `• ${fonts.monospace("{pn} money 1.5m @Christus")}\n` +
           `• ${fonts.monospace("{pn} money all 5000")}\n` +
           `• ${fonts.monospace("{pn} money reset")}\n` +
           `• ${fonts.monospace("{pn} exp 5000")}\n\n` +
           `${fonts.bold("📌 Suffixes :")} k / m / b / t / q`
    }
  },

  onStart: async function ({ message, event, args, usersData, api }) {
    if (!ADMIN_UIDS.includes(event.senderID.toString())) {
      return message.reply("⛔ Accès refusé : privilèges administrateur requis.");
    }

    const action = args[0]?.toLowerCase();
    const sub    = args[1]?.toLowerCase();

    // ─────────────────────────────────────────────────────────────
    // set money all <montant>  →  même montant pour tout le monde
    // ─────────────────────────────────────────────────────────────
    if (action === "money" && sub === "all") {
      let amount = parseAmount(args[2]);
      if (isNaN(amount)) amount = parseFloat(args[2]);
      if (isNaN(amount)) {
        return message.reply("❌ Montant invalide.\nExemple : set money all 5000 ou set money all 1.5m");
      }

      await message.reply("⏳ Mise à jour en cours, veuillez patienter...");

      try {
        const allUsers = await usersData.getAll();
        let count = 0;
        for (const user of allUsers) {
          const uid = user.userID || user.id;
          if (!uid) continue;
          await usersData.set(uid, { money: amount });
          count++;
        }
        return message.reply(
          `✅ Terminé !\n💰 Argent défini à ${formatMoney(amount)} pour ${count} utilisateur(s).`
        );
      } catch (err) {
        return message.reply(`❌ Erreur lors de la mise à jour globale :\n${err.message}`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // set money reset  →  remettre à 0 les 10 premiers du top
    // ─────────────────────────────────────────────────────────────
    if (action === "money" && sub === "reset") {
      try {
        const allUsers = await usersData.getAll();
        const top10 = allUsers
          .filter(u => (u.money || 0) > 0)
          .sort((a, b) => (b.money || 0) - (a.money || 0))
          .slice(0, 10);

        if (top10.length === 0) {
          return message.reply("❌ Aucun utilisateur avec de l'argent trouvé.");
        }

        const lines = [];
        for (const user of top10) {
          const uid = user.userID || user.id;
          if (!uid) continue;
          await usersData.set(uid, { money: 0 });
          lines.push(`• ${user.name || uid} (${uid}) : ${formatMoney(user.money)} ➜ 0$`);
        }

        return message.reply(
          `🔄 Reset effectué pour les ${lines.length} premiers du top :\n\n${lines.join("\n")}`
        );
      } catch (err) {
        return message.reply(`❌ Erreur lors du reset :\n${err.message}`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Résolution de la cible (tag / uid brut / soi-même)
    // ─────────────────────────────────────────────────────────────
    let targetID = Object.keys(event.mentions)[0];
    if (!targetID) {
      const potentialUID = args.find(a => /^\d{10,}$/.test(a));
      if (potentialUID) targetID = potentialUID;
      else targetID = event.senderID;
    }

    let userData;
    try {
      userData = await usersData.get(targetID);
      if (!userData) return message.reply("❌ Utilisateur introuvable dans la base de données.");
    } catch (err) {
      return message.reply(`❌ Erreur lors de la récupération : ${err.message}`);
    }

    // ─────────────────────────────────────────────────────────────
    // set money <montant> [@user|uid]
    // ─────────────────────────────────────────────────────────────
    if (action === "money") {
      let amount = parseAmount(args[1]);
      if (isNaN(amount)) amount = parseFloat(args[1]);
      if (isNaN(amount)) {
        return message.reply("❌ Montant invalide. Exemple : set money 5000 ou set money 1.5m");
      }
      try {
        await usersData.set(targetID, { money: amount });
        let name = userData.name || targetID;
        try { const i = await api.getUserInfo([targetID]); name = i[targetID]?.name || name; } catch (_) {}
        return message.reply(`💰 Argent défini à ${formatMoney(amount)} pour ${name}.`);
      } catch (err) {
        return message.reply(`❌ Erreur : ${err.message}`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // set exp <valeur> [@user|uid]
    // ─────────────────────────────────────────────────────────────
    else if (action === "exp") {
      const amount = parseFloat(args[1]);
      if (isNaN(amount)) return message.reply("❌ Valeur d'XP invalide. Exemple : set exp 1500");
      try {
        await usersData.set(targetID, { exp: amount });
        let name = userData.name || targetID;
        try { const i = await api.getUserInfo([targetID]); name = i[targetID]?.name || name; } catch (_) {}
        return message.reply(`🌟 XP définie à ${amount.toLocaleString()} pour ${name}.`);
      } catch (err) {
        return message.reply(`❌ Erreur : ${err.message}`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // set custom <variable> <valeur> [@user|uid]
    // ─────────────────────────────────────────────────────────────
    else if (action === "custom") {
      const variable = args[1];
      const value    = args[2];
      if (!variable || value === undefined) {
        return message.reply("❌ Utilisation : set custom <variable> <valeur> [@user]");
      }
      try {
        await usersData.set(targetID, { [variable]: value });
        let name = userData.name || targetID;
        try { const i = await api.getUserInfo([targetID]); name = i[targetID]?.name || name; } catch (_) {}
        return message.reply(`🔧 Variable "${variable}" définie à "${value}" pour ${name}.`);
      } catch (err) {
        return message.reply(`❌ Erreur : ${err.message}`);
      }
    }

    else {
      return message.SyntaxError();
    }
  }
};
