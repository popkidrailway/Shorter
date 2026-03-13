const crypto = require('crypto');
const zlib = require('zlib'); // Built-in Node.js module

let storageBackend = null;
let mongoModel = null;
let pgPool = null;

function generateShortId() {
    return crypto.randomBytes(9).toString('base64')
        .replace(/[+/=]/g, '')
        .slice(0, 12);
}

function detectDbType(url) {
    if (!url) return null;
    if (url.startsWith('mongodb://') || url.startsWith('mongodb+srv://')) return 'mongodb';
    if (url.startsWith('postgres://') || url.startsWith('postgresql://')) return 'postgresql';
    return null;
}

async function init(config) {
    const dbType = detectDbType(config.DATABASE_URL);

    if (dbType === 'mongodb') {
        try {
            const mongoose = require('mongoose');
            await mongoose.connect(config.DATABASE_URL);
            const sessionSchema = new mongoose.Schema({
                shortId: { type: String, required: true, unique: true, index: true },
                data: { type: String, required: true },
                createdAt: { type: Date, default: Date.now }
            });
            mongoModel = mongoose.models.GiftedSession || mongoose.model('GiftedSession', sessionSchema);
            storageBackend = 'mongodb';
            console.log('✅ Session storage: MongoDB connected (Supports Short & Long)');
        } catch (e) {
            console.error('❌ MongoDB connection failed:', e.message);
        }
    } else if (dbType === 'postgresql') {
        try {
            const { Pool } = require('pg');
            pgPool = new Pool({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
            await pgPool.query(`
                CREATE TABLE IF NOT EXISTS gifted_sessions (
                    short_id VARCHAR(20) PRIMARY KEY,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            storageBackend = 'postgresql';
            console.log('✅ Session storage: PostgreSQL connected (Supports Short & Long)');
        } catch (e) {
            console.error('❌ PostgreSQL connection failed:', e.message);
        }
    } else {
        console.log('⚠️ Session storage: Using Long Session (Zlib) only (No Database)');
    }
}

function isConfigured() {
    return storageBackend !== null;
}

/**
 * Handles both Short (DB) and Long (Zlib) saving
 * @param {string} fullSessionString - The stringified session data
 * @param {string} type - 'short' or 'long'
 */
async function saveSession(fullSessionString, type = 'short') {
    // 1. Long Session Logic: Compress and return the full string
    if (type === 'long' || !isConfigured()) {
        const compressed = zlib.deflateSync(fullSessionString).toString('base64');
        return `GIFTED_MD_${compressed}`; // This is the "Long" code
    }

    // 2. Short Session Logic: Save to DB and return a short ID
    const shortId = generateShortId();
    if (storageBackend === 'mongodb') {
        await mongoModel.create({ shortId, data: fullSessionString });
    } else if (storageBackend === 'postgresql') {
        await pgPool.query(
            'INSERT INTO gifted_sessions (short_id, data) VALUES ($1, $2)',
            [shortId, fullSessionString]
        );
    }
    return shortId;
}

async function getSession(id) {
    // If it starts with the Long Session prefix, decompress it directly
    if (id.startsWith('GIFTED_MD_')) {
        const base64Data = id.replace('GIFTED_MD_', '');
        return zlib.inflateSync(Buffer.from(base64Data, 'base64')).toString();
    }

    // Otherwise, fetch from Database
    const safeId = id.replace(/[^a-zA-Z0-9]/g, '');
    if (storageBackend === 'mongodb') {
        const doc = await mongoModel.findOne({ shortId: safeId });
        return doc ? doc.data : null;
    } else if (storageBackend === 'postgresql') {
        const result = await pgPool.query(
            'SELECT data FROM gifted_sessions WHERE short_id = $1',
            [safeId]
        );
        return result.rows[0] ? result.rows[0].data : null;
    }

    return null;
}

module.exports = { init, isConfigured, saveSession, getSession };
