const a = require("axios");
const b = require("fs");
const c = require("path");
const d = require("yt-search");

const nix = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

module.exports = {
  config: {
    name: "sing",
    aliases: ["music", "song"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    shortDescription: "Sing tomake chai",
    longDescription: "Search and download music from YouTube",
    category: "MUSIC",
    guide: "/music <song name or YouTube URL>"
  },

  onStart: async function ({ api: e, event: f, args: g }) {
    if (!g.length) return e.sendMessage("❌ Provide a song name or YouTube URL.", f.threadID, f.messageID);

    let baseApi;
    const i = await e.sendMessage("🎵 Please wait...", f.threadID, null, f.messageID);
    
    try {
      const configRes = await a.get(nix);
      baseApi = configRes.data && configRes.data.api;
      if (!baseApi) throw new Error("Configuration Error: Missing API in GitHub JSON.");
    } catch (error) {
      e.unsendMessage(i.messageID);
      return e.sendMessage("❌ Failed to fetch API configuration from GitHub.", f.threadID, f.messageID);
    }

    let h = g.join(" ");

    try {
      let j;
      if (h.startsWith("http")) {
        j = h;
      } else {
        const k = await d(h);
        if (!k || !k.videos.length) throw new Error("No results found.");
        j = k.videos[0].url;
      }

      const l = `${baseApi}/play?url=${encodeURIComponent(j)}`;
      const m = await a.get(l);
      const n = m.data;

      if (!n.status || !n.downloadUrl) throw new Error("API failed to return download URL.");

      const o = `${n.title}.mp3`.replace(/[\\/:"*?<>|]/g, "");
      const p = c.join(__dirname, o);

      const q = await a.get(n.downloadUrl, { responseType: "arraybuffer" });
      b.writeFileSync(p, q.data);

      await e.sendMessage(
        { attachment: b.createReadStream(p), body: `🎵 𝗠𝗨𝗦𝗜𝗖\n━━━━━━━━━━━━━━━\n\n${n.title}` },
        f.threadID,
        () => {
          b.unlinkSync(p);
          e.unsendMessage(i.messageID);
        },
        f.messageID
      );

    } catch (r) {
      console.error(r);
      e.sendMessage(`❌ Failed to download song: ${r.message}`, f.threadID, f.messageID);
      e.unsendMessage(i.messageID);
    }
  }
};
