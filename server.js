require('dotenv').config();

console.log("🔥 SERVER FILE VERSION 999");

const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 📞 1. SOCKET.IO IMPORTS
const http = require('http'); 
const { Server } = require('socket.io');

// 📞 2. CREATE THE PHONE TOWER
// We wrap Express inside a raw HTTP server so it can handle BOTH web traffic and live sockets.
const server = http.createServer(app); 
const io = new Server(server, { 
    cors: { origin: "*" } // Allows your frontend to connect without getting blocked
});

// 📞 3. GIVE EXPRESS THE WALKIE-TALKIE
// This lets your controllers (like ticketController) broadcast messages later!
app.set('socketio', io);

// 📞 4. TURN ON THE RECEIVER
io.on('connection', (socket) => {
    console.log('⚡ A user connected to the Live Box Office!');
    
    socket.on('disconnect', () => {
        console.log('🔌 A user left the Box Office.');
    });
});

// ==========================================
// 🗄️ DATABASE & ROUTES
// ==========================================
const connectDB = require('./config/db');
connectDB();

const ticketRouter = require('./routes/ticketRoutes');
const eventRouter = require('./routes/eventRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRouter = require('./routes/adminRoutes');
const errorHandler = require('./middlewares/errorHandler');

app.use(cors());

// 🛡️ SECURITY: Helmet sets secure HTTP headers (XSS protection, no sniffing, etc.)
// We disable contentSecurityPolicy so our inline <script> tags and external CDNs still work
app.use(helmet({ contentSecurityPolicy: false }));

app.use(express.json({ limit: '10kb' })); // 🛡️ Block oversized payloads
app.use(express.static('public'));

// 🛡️ SECURITY: Rate limiting — prevents spammers from hammering your API
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15-minute window
    max: 20,                    // Max 20 login/signup attempts per 15 min
    message: { success: false, message: "Too many attempts. Chill for 15 minutes." }
});
const ticketLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,   // 1-minute window
    max: 30,                    // Max 30 ticket actions per minute
    message: { success: false, message: "Slow down! Too many ticket requests." }
});

// Global request logger
app.use((req, res, next) => {
    console.log(`[REQUEST LOG] 🔥 Method: ${req.method} | URL: ${req.originalUrl}`);
    next();
});

// Test route
app.get('/ping', (req, res) => {
    console.log("🔥 PING ROUTE HIT");
    res.json({ message: "pong" });
});

// Routes (with rate limiters attached)
app.use('/tickets', ticketLimiter, ticketRouter);
app.use('/events', eventRouter);
app.use('/users', authLimiter, userRoutes);
app.use('/admin', adminRouter); // 🔥 Plug in the new Admin microservice!

// 404 handler
app.use((req, res) => {
    console.log(`❌ 404 HIT: ${req.method} ${req.originalUrl}`);
    
    return res.status(404).json({
        error: "Endpoint not found on TitanGate server"
    });
});

app.use(errorHandler);
const PORT = process.env.PORT || 5000;

// 📞 5. CRITICAL FIX: START THE TOWER, NOT JUST EXPRESS
// Notice this says 'server.listen' now, not 'app.listen'
server.listen(PORT, () => {
    console.log(`[SYSTEM] TitanGate core engine running on production port ${PORT}`);
});