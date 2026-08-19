const axios = require("axios");

module.exports = {
  config: {
    name: "boom",
    version: "1.8",
    author: "SaGor",
    role: 2,
    shortDescription: "JSON Boom",
    category: "fun",
    guide: "boom <1-1000>"
  },

  onStart: async function ({ api, event, args }) {

    const threadID = event.threadID;

    if (!args[0]) {
      return api.sendMessage("boom <1-1000>", threadID);
    }

    let limit = parseInt(args[0]);

    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return api.sendMessage("Limit must be between 1-1000", threadID);
    }

    try {

      const res = await axios.get("https://raw.githubusercontent.com/SAGOR-KINGx/all-around/main/bom.json");

      const text = res.data.text;

      if (!text) return;

      for (let i = 0; i < limit; i++) {

        await api.sendMessage(text, threadID);

        await new Promise(r => setTimeout(r, 600));

      }

    } catch (err) {
      api.sendMessage("Error: " + err.message, threadID);
    }

  }
};
