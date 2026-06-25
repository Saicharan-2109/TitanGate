const crypto = require('crypto');
if (!globalThis.crypto) globalThis.crypto = crypto.webcrypto;
const mongoose = require('mongoose');

const connectDB = async () => {
    console.log("DB connection function started...");
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000 // Waits 10 seconds max before timing out
        });
        console.log(`[DATABASE] TitanGate cloud vault successfully linked on host: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[CRITICAL DATABASE ERROR]: ${error.message}`);
        process.exit(1); // Shuts down the engine safely if database is missing
    }
};

module.exports = connectDB;