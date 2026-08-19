 const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");

async function getStream(url) {
  const res = await axios({ url, responseType: "stream" });
  return res.data;
}

module.exports = {
  config: {
    name: "sing",
    aliases: ["music", "song"],
    version: "0.0.1",
    author: "Christus",
    countDown: 5,
    role: 0,
    shortDescription: "Chanter pour se détendre",
    longDescription: "Rechercher et télécharger de la musique depuis YouTube",
    category: "media",
    guide: "/play <nom de la chanson ou URL YouTube>"
  },

  onStart: async function ({ api, event, args, commandName }) {
    if (!args.length) 
      return api.sendMessage("❌ Veuillez fournir un nom de chanson ou une URL YouTube.", event.threadID, event.messageID);

    const query = args.join(" ");
    if (query.startsWith("http")) return downloadSong(query, api, event);

    try {
      const res = await ytSearch(query);
      const results = res.videos.slice(0, 6);
      if (!results.length) 
        return api.sendMessage("❌ Aucun résultat trouvé.", event.threadID, event.messageID);

      let msg = "";
      results.forEach((v, i) => {
        msg += `${i + 1}. ${v.title}\n⏱ ${v.timestamp} | 👀 ${v.views}\n\n`;
      });

      const thumbs = await Promise.all(results.map(v => getStream(v.thumbnail)));

      api.sendMessage(
        { body: msg + "Répondez avec le numéro (1-6) pour télécharger la chanson", attachment: thumbs },
        event.threadID,
        (err, info) => {
          if (err) return console.error(err);
          global.GoatBot.onReply.set(info.messageID, {
            results,
            messageID: info.messageID,
            author: event.senderID,
            commandName
          });
        },
        event.messageID
      );
    } catch (err) {
      console.error(err);
      api.sendMessage("❌ Échec de la recherche sur YouTube.", event.threadID, event.messageID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const results = Reply.results;
    const choice = parseInt(event.body);

    if (isNaN(choice) || choice < 1 || choice > results.length) {
      return api.sendMessage("❌ Sélection invalide.", event.threadID, event.messageID);
    }

    const selected = results[choice - 1];
    await api.unsendMessage(Reply.messageID);

    downloadSong(selected.url, api, event, selected.title);
  }
};

async function downloadSong(url, api, event, title = null) {
  try {
    const apiUrl = `http://65.109.80.126:20409/aryan/play?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl);
    const data = res.data;

    if (!data.status || !data.downloadUrl) throw new Error("L'API n'a pas renvoyé d'URL de téléchargement.");

    const songTitle = title || data.title;
    const fileName = `${songTitle}.mp3`.replace(/[\\/:"*?<>|]/g, "");
    const filePath = path.join(__dirname, fileName);

    const songData = await axios.get(data.downloadUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(filePath, songData.data);

    await api.sendMessage(
      { body: `• ${songTitle}`, attachment: fs.createReadStream(filePath) },
      event.threadID,
      () => fs.unlinkSync(filePath),
      event.messageID
    );
  } catch (err) {
    console.error(err);
    api.sendMessage(`❌ Échec du téléchargement de la chanson : ${err.message}`, event.threadID, event.messageID);
  }
  }
