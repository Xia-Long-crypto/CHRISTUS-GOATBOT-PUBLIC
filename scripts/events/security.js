const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
	name: "security",
	eventType: ["log:subscribe", "log:unsubscribe"],
	version: "1.0",
	credits: "Jordan AI",
	description: "Détecte les tentatives d'intrusion / usage non autorisé et réagit automatiquement"
};

// === CONFIG À ADAPTER ===
const OWNER_UID = "61592645646617"; // UID owner (Xia)
const MAX_ATTEMPTS = 3;          // nb de tentatives suspectes tolérées avant ban
const WINDOW_MS = 60 * 1000;     // fenêtre de temps pour compter les tentatives (1 min)
const BAN_MESSAGE = "🚫 Accès refusé. Cette action a été signalée et bloquée.";

// stock en mémoire : { uid: [timestamps] }
const suspiciousLog = new Map();

function flagSuspicious(uid) {
	const now = Date.now();
	const list = (suspiciousLog.get(uid) || []).filter(t => now - t < WINDOW_MS);
	list.push(now);
	suspiciousLog.set(uid, list);
	return list.length;
}

async function alertOwner(api, text) {
	try {
		await api.sendMessage(
			"🤖 𝗝𝗼𝗿𝗱𝗮𝗻 𝗔𝗜\n━━━━━━━━━\n⚠️ ALERTE SÉCURITÉ\n\n" + text,
			OWNER_UID
		);
	} catch (e) {
		console.log("[SECURITY] Impossible d'alerter l'owner:", e.message);
	}
}

async function banIntruder(api, threadID, senderID) {
	try {
		// Ban global du bot (ajoute au fichier des bannis GoatBot si dispo)
		const { threadsData, usersData } = global.db || {};
		if (usersData && usersData.updateUserData) {
			await usersData.updateUserData(senderID, { banned: true, reason: "Détection intrusion automatique" });
		}
		// Kick du groupe s'il y en a un
		if (threadID && threadID !== senderID) {
			await api.removeUserFromGroup(senderID, threadID).catch(() => {});
		}
	} catch (e) {
		console.log("[SECURITY] Erreur ban:", e.message);
	}
}

// === Point d'entrée unique attendu par GoatBot v2 ===
module.exports.onStart = async function ({ api, event }) {
	const { threadID, senderID, body, logMessageType, author } = event;
	const config = global.GoatBot?.config || {};
	const adminBot = config.adminBot || [];

	// --- Cas 1 : changement d'admins du groupe non autorisé ---
	if (logMessageType === "log:thread-admins") {
		const actorID = author;
		if (!adminBot.includes(actorID)) {
			await alertOwner(
				api,
				`Modification suspecte des admins du groupe ${threadID} par UID non autorisé: ${actorID}`
			);
			await banIntruder(api, threadID, actorID);
		}
		return;
	}

	// --- Cas 2 : message contenant un mot-clé sensible ---
	if (!senderID || !body || senderID === api.getCurrentUserID()) return;
	if (adminBot.includes(senderID)) return; // owner/admin exempté

	const sensitiveKeywords = [
		"fbstate", "appstate", "cookie", "token", "adminbot",
		"eval", "exec", "shutdown", "restart", "setadmin", "config.json"
	];
	const lower = body.toLowerCase();
	const isSensitiveAttempt = sensitiveKeywords.some(k => lower.includes(k));

	if (isSensitiveAttempt) {
		const attempts = flagSuspicious(senderID);

		await alertOwner(
			api,
			`UID suspect: ${senderID}\nThread: ${threadID}\nMessage: "${body}"\nTentative n°${attempts}`
		);

		if (attempts >= MAX_ATTEMPTS) {
			await api.sendMessage(BAN_MESSAGE, threadID);
			await banIntruder(api, threadID, senderID);
			await alertOwner(api, `🔨 UID ${senderID} banni automatiquement (seuil dépassé).`);
			suspiciousLog.delete(senderID
);
		}
	}
};
