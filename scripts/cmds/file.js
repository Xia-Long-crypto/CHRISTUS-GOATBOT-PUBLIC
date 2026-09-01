const { createCanvas } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const { config } = global.GoatBot;

function fancyText(text) {
  return global.utils?.toGlobalFontStyle ? global.utils.toGlobalFontStyle(text) : text;
}

// --- FONCTION DE GÉNÉRATION DE CANVAS STYLE DARK PREMIUM ---
async function generateFileCanvas(fileName, status, senderName) {
    const width = 900; 
    const height = 380; 
    const padding = 55;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Fond Ultra Dark Premium
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, height);
    gradient.addColorStop(0, '#16161c');
    gradient.addColorStop(1, '#08080a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Bordure Fine Or Ambré
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 3; 
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // 3. En-tête / Message principal agrandi
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif'; 
    ctx.fillText(`Hey ${senderName}, extraction demandée`, padding, 70);

    ctx.fillStyle = '#d4af37'; 
    ctx.font = 'bold 14px monospace'; 
    ctx.fillText(`CORE FILE EXTRACTOR PROTOCOL v1.3 • PREMIUM ACCESS`, padding, 100);

    // Ligne de séparation
    ctx.strokeStyle = '#282830';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, 115);
    ctx.lineTo(width - padding, 115);
    ctx.stroke();

    // 4. Blocs de Données (Target File vs Status)
    const boxWidth = (width - (padding * 2) - 30) / 2;
    const boxHeight = 120; 
    const boxY = 145;

    // --- BLOC FICHIER ---
    const box1X = padding;
    ctx.fillStyle = '#0f0f12';
    ctx.beginPath();
    ctx.roundRect(box1X, boxY, boxWidth, boxHeight, 14);
    ctx.fill();
    ctx.strokeStyle = '#1e1e24';
    ctx.stroke();

    ctx.fillStyle = '#d4af37';
    ctx.fillRect(box1X, boxY + 25, 5, boxHeight - 50);

    ctx.font = 'bold 15px sans-serif'; 
    ctx.fillStyle = '#8e8e93';
    ctx.fillText('TARGET FILE', box1X + 25, boxY + 38);
    
    ctx.font = 'bold 28px monospace'; 
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fileName, box1X + 25, boxY + 82);

    // --- BLOC STATUT ---
    const box2X = box1X + boxWidth + 30;
    ctx.fillStyle = '#0f0f12';
    ctx.beginPath();
    ctx.roundRect(box2X, boxY, boxWidth, boxHeight, 14);
    ctx.fill();
    ctx.strokeStyle = '#1e1e24';
    ctx.stroke();

    const isSuccess = status.includes("SUCCESS");
    ctx.fillStyle = isSuccess ? '#d4af37' : '#ff453a';
    ctx.fillRect(box2X, boxY + 25, 5, boxHeight - 50);

    ctx.font = 'bold 15px sans-serif'; 
    ctx.fillStyle = '#8e8e93';
    ctx.fillText('EXTRACTION STATUS', box2X + 25, boxY + 38);
    
    ctx.font = 'bold 28px monospace'; 
    ctx.fillStyle = isSuccess ? '#d4af37' : '#ff453a';
    ctx.fillText(status, box2X + 25, boxY + 82);

    // 5. Footer Premium
    ctx.textAlign = 'center';
    ctx.font = '13px monospace'; 
    ctx.fillStyle = '#4a4a52';
    ctx.fillText(`SECURE FILE TRANSMISSION • RAYD SYSTEMS PREMIUM`, width / 2, height - 40);

    // Sauvegarde temporaire en cache avec identifiant unique
    const dirCache = global.client?.dirCache || path.join(__dirname, "cache");
    await fs.ensureDir(dirCache);
    const imagePath = path.join(dirCache, `file_premium_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`);
    await fs.promises.writeFile(imagePath, canvas.toBuffer('image/png'));
    return imagePath;
}

// --- MODULE PRINCIPAL ---
module.exports = {
  config: {
    name: "file",
    aliases: ["src", "readfile"],
    version: "1.3.1",
    author: "rayd",
    countDown: 5,
    role: 2, 
    shortDescription: { en: "Get command code in copyable format + Dark Premium canvas" },
    longDescription: { en: "Extracts and sends the source code of any command file inline for easy copying." },
    category: "owner",
    guide: { en: "{pn} [nom_commande]" }
  },

  onStart: async function ({ message, event, args, usersData }) {
    const devArray = config.developer || config.devUsers || config.developers || [];
    
    // Vérification stricte des permissions dev
    if (!devArray.includes(event.senderID.toString())) {
      return message.reply(fancyText("✕ Accès refusé : Ce protocole est strictement réservé à l'équipe de développement RAYD."));
    }

    let senderName = "Développeur";
    try {
        if (usersData && event.senderID) {
            senderName = await usersData.getName(event.senderID) || "Développeur";
        }
    } catch (e) {}

    const commandName = args[0];
    let canvasPath = null;

    if (!commandName) {
        try {
            canvasPath = await generateFileCanvas("None", "ERROR: MISSING ARG", senderName);
            await message.reply({
                body: fancyText("⚠️ Veuillez spécifier le nom d'une commande (ex: file prefix)."),
                attachment: fs.createReadStream(canvasPath)
            });
        } catch (err) {
            await message.reply(fancyText("⚠️ Veuillez spécifier le nom d'une commande."));
        } finally {
            if (canvasPath && fs.existsSync(canvasPath)) await fs.unlink(canvasPath);
        }
        return;
    }

    const targetFileName = commandName.endsWith('.js') ? commandName : `${commandName}.js`;
    
    // Détermination dynamique des dossiers de scripts courants sous GoatBot
    const pathsToSearch = [
        path.join(__dirname, targetFileName),                             // Dossier actuel du script
        path.join(__dirname, '..', 'cmds', targetFileName),               // Dossier parent/cmds
        path.join(process.cwd(), 'scripts', 'cmds', targetFileName),      // Chemin standard Goatbot v2 racine
        path.join(process.cwd(), 'modules', 'commands', targetFileName)   // Alternative structures
    ];

    let filePath = null;
    for (const p of pathsToSearch) {
        if (fs.existsSync(p)) {
            filePath = p;
            break;
        }
    }

    if (!filePath) {
        try {
            canvasPath = await generateFileCanvas(targetFileName, "ERROR: NOT FOUND", senderName);
            await message.reply({
                body: fancyText(`❌ Impossible de localiser le fichier "${targetFileName}" dans les répertoires actifs.`),
                attachment: fs.createReadStream(canvasPath)
            });
        } catch (err) {
            await message.reply(fancyText(`❌ Impossible de localiser le fichier "${targetFileName}".`));
        } finally {
            if (canvasPath && fs.existsSync(canvasPath)) await fs.unlink(canvasPath);
        }
        return;
    }

    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        canvasPath = await generateFileCanvas(targetFileName, "SUCCESS: EXTRACTED", senderName);

        // Envoi de la réponse avec l'image générée et le code markdown copiable
        await message.reply({
            body: `📦 **Extraction réussie pour ${targetFileName}** :\n\n\`\`\`javascript\n${fileContent}\n\`\`\``,
            attachment: fs.createReadStream(canvasPath)
        });

    } catch (error) {
        try {
            canvasPath = await generateFileCanvas(targetFileName, "ERROR: FAILED", senderName);
            await message.reply({
                body: fancyText(`⚠️ Une erreur est survenue lors de la lecture : ${error.message}`),
                attachment: fs.createReadStream(canvasPath)
            });
        } catch (err) {
            await message.reply(fancyText(`⚠️ Une erreur est survenue lors de la lecture du code.`));
        }
    } finally {
        if (canvasPath && fs.existsSync(canvasPath)) {
            try {
                await fs.unlink(canvasPath);
            } catch (err) {
                console.error("Erreur nettoyage fichier temporaire:", err);
            }
        }
    }
  }
};
