require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 50900,
    SESSION_PREFIX: process.env.SESSION_PREFIX || "POPKID~",
    GC_JID: process.env.GC_JID || "KkmgIqh7LCc3eNIW2bUJgP",
    DATABASE_URL: process.env.DATABASE_URL || "mongodb+srv://popkid:taracha2004%3F@cluster0.i50ot50.mongodb.net/?retryWrites=true&w=majority",
    BOT_REPO: process.env.BOT_REPO || "https://github.com/popkidc/POPKID-XD",
    WA_CHANNEL: process.env.WA_CHANNEL || "https://whatsapp.com/channel/0029Vb70ySJHbFV91PNKuL3T",
    MSG_FOOTER: process.env.MSG_FOOTER || "",
};
