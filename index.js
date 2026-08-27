/**
 * @author NTKhang
 * ! The source code is written by NTKhang, please don't change the author's name everywhere. Thank you for using
 * ! Official source code: https://github.com/ntkhang03/Goat-Bot-V2
 * ! If you do not download the source code from the above address, you are using an unknown version and at risk of having your account hacked
 *
 * English:
 * ! Please do not change the below code, it is very important for the project.
 * It is my motivation to maintain and develop the project for free.
 * ! If you change it, you will be banned forever
 * Thank you for using
 *
 * Vietnamese:
 * ! Vui lòng không thay đổi mã bên dưới, nó rất quan trọng đối với dự án.
 * Nó là động lực để tôi duy trì và phát triển dự án miễn phí.
 * ! Nếu thay đổi nó, bạn sẽ bị cấm vĩnh viễn
 * Cảm ơn bạn đã sử dụng
 */

const { spawn } = require("child_process");
const log = require("./logger/log.js");
const http = require("http");
const axios = require("axios");

// ─── Serveur HTTP minimal pour que Render détecte le service comme actif ───
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "text/plain" });
	res.end("Jordan Bot is running ✅");
}).listen(PORT, () => {
	log.info(`Serveur HTTP démarré sur le port ${PORT}`);
});

// ─── Auto-ping toutes les 4 minutes pour éviter la mise en veille ───
const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

setInterval(() => {
	axios.get(SELF_URL, { timeout: 10000 })
		.then(() => log.info("✅ Self-ping OK"))
		.catch((err) => log.info("❌ Self-ping échoué: " + err.message));
}, 4 * 60 * 1000);

// ─── Lancement du bot avec redémarrage automatique en cas de crash ───
function startProject() {
	const child = spawn("node", ["Goat.js"], {
		cwd: __dirname,
		stdio: "inherit",
		shell: true
	});

	child.on("close", (code) => {
        if (code !== 0) {
            log.info("Bot crashed (code " + code + "), restarting...");
            startProject();
        }
    });
}

startPro
					 ject();
