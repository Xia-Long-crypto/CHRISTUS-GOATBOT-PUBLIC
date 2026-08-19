const { createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "pirate",
        aliases: ["mutinerie", "blackflag", "darkpirate"],
        version: "2.5",
        author: "Camille Uchiha 🏴‍☠️ & Célestin",
        countDown: 0, // Réduit à 0 pour un lancement immédiat
        role: 0,
        shortDescription: {
            fr: "🏴‍☠️ Mutinerie ultra-rapide sans aucune pitié ! ⚔️"
        },
        longDescription: {
            fr: "Destitue, exclut 5 membres et change l'image du groupe en parallèle à la vitesse maximale."
        },
        category: "admin",
        guide: {
            fr: `• pirate → Lance le raid instantané.`
        }
    },

    onChat: async function({ api, event, message, args }) {
        if (!event.body) return;
        const msg = event.body.toLowerCase().trim();
        const trigger = msg.split(" ")[0];
        
        if (trigger === "pirate" || this.config.aliases.includes(trigger)) {
            const newArgs = msg.split(" ").slice(1);
            return this.onStart({ api, event, args: newArgs, message });
        }
    },

    onStart: async function({ api, event, args, message }) {
        const botAdmins = global.GoatBot.config.adminBot || [];
        const senderID = event.senderID;
        const threadID = event.threadID;

        try {
            if (!botAdmins.includes(senderID)) {
                return message.reply("⛓️💀 Seul le Capitaine Suprême du bot peut ordonner une telle mutinerie...");
            }

            if (!event.isGroup) {
                return message.reply("🏴‍☠️ Fais ça dans un groupe.");
            }

            const threadInfo = await api.getThreadInfo(threadID);
            const botID = api.getCurrentUserID();
            const botIsAdmin = threadInfo.adminIDs.some(admin => admin.id === botID);

            if (!botIsAdmin) {
                return message.reply("⚔️ Le bot doit être admin d'abord.");
            }

            // --- CAS UNIQUE : LE RAID ULTRA RAPIDE ---
            const pirateNames = [
                "L'Ombre du Hollandais 🏴‍☠️",
                "La Baie des Naufrageurs 💀",
                "Le Sabbat Noir 🌊",
                "Les Écorcheurs des Mers ⚔️",
                "L'Armada Maudite ⚓"
            ];
            const randomPirateName = pirateNames[Math.floor(Math.random() * pirateNames.length)];
            
            // Lancement immédiat du changement de titre
            api.setTitle(randomPirateName, threadID).catch(e => console.error(e));

            // Génération ultra-rapide de l'image Canvas
            const cachePath = path.join(__dirname, "cache", `pirate_${threadID}.png`);
            await fs.ensureDir(path.dirname(cachePath));

            const canvas = createCanvas(600, 600);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#0d0d0d";
            ctx.fillRect(0, 0, 600, 600);
            ctx.strokeStyle = "#8b0000";
            ctx.lineWidth = 15;
            ctx.strokeRect(20, 20, 560, 560);
            ctx.fillStyle = "#ff0000";
            ctx.font = "bold 45px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("MUTINERIE ACTIVER", 300, 150);
            ctx.fillStyle = "#ffffff";
            ctx.font = "italic bold 30px sans-serif";
            ctx.fillText(randomPirateName.toUpperCase(), 300, 280);
            ctx.fillStyle = "#aa0000";
            ctx.font = "25px sans-serif";
            ctx.fillText("SOUS LE CONTRÔLE DU BOT", 300, 420);

            await fs.writeFile(cachePath, canvas.toBuffer("image/png"));

            // Application immédiate de l'image du groupe
            api.changeGroupImage(fs.createReadStream(cachePath), threadID).catch(e => console.error(e));

            // Préparation des cibles (admins à destituer)
            const allAdmins = threadInfo.adminIDs.map(admin => admin.id);
            const adminsToRemove = allAdmins.filter(id => id !== botID && id !== senderID);

            // Préparation des cibles (5 membres au hasard à exclure)
            const allMembers = threadInfo.participantIDs;
            const eligibleToKick = allMembers.filter(id => id !== botID && id !== senderID);
            const shuffled = eligibleToKick.sort(() => 0.5 - Math.random());
            const targetsToKick = shuffled.slice(0, 5);

            // Création d'un groupe de promesses pour tout exécuter EN MÊME TEMPS
            const adminPromises = adminsToRemove.map(adminID => 
                api.changeAdminStatus(threadID, adminID, false).catch(err => console.error("Échec destitution:", err))
            );

            const kickPromises = targetsToKick.map(memberID => 
                api.removeUserFromGroup(memberID, threadID).catch(err => console.error("Échec exclusion:", err))
            );

            // Ajout du créateur en admin si ce n'est pas déjà fait
            if (!allAdmins.includes(senderID)) {
                adminPromises.push(api.changeAdminStatus(threadID, senderID, true).catch(e => console.error(e)));
            }

            // On lance TOUTES les destitutions et TOUTES les exclusions simultanément
            await Promise.all([...adminPromises, ...kickPromises]);

            // Message de fin
            let replyMsg = `💀 𝑴𝑼𝑻𝑰𝑵𝑬𝑹𝑰𝑬 𝑬́𝑪𝑳𝑨𝑰𝑹 💀\n\n` +
                `⚓ 𝑵𝒂𝒗𝒊𝒓𝒆 : ${randomPirateName}\n` +
                `⚔️ Nettoyage des grades terminé.\n` +
                `🦈 5 intrus jetés à l'eau.\n` +
                `👑 Contrôle total établi.`;

            await message.reply({
                body: replyMsg,
                attachment: fs.createReadStream(cachePath)
            });

            fs.unlinkSync(cachePath);

        } catch (error) {
            console.error(error);
        }
    }
};
