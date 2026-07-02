const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');

// 1. ALL CONTROLLER IMPORT WEAPONS
const { 
    bookNewTicket, 
    getAllTickets, 
    reserveSeat, 
    confirmBooking, 
    cancelReservation,
    getMyTickets,
    lockSeat,
    createPaymentOrder       
} = require('../controllers/ticketController');

// 2. STARTUP DIAGNOSTIC LOGS
console.log("🚀 ticketRoutes.js loaded");
console.log("🔥 All advanced state-machine routes registered");

// ==========================================
// 📄 GET ROUTES (Fetching Data)
// ==========================================
router.get('/', getAllTickets);
router.get('/test', (req, res) => { res.json({ message: "test route works smoothly" }); });
router.get('/my-tickets', verifyToken, getMyTickets); 

// ==========================================
// 📥 POST ROUTES (Creating / State Changes)
// ==========================================
router.post('/',verifyToken,bookNewTicket);
router.post('/reserve', verifyToken, reserveSeat);
router.post('/confirm', verifyToken, confirmBooking);
router.post('/cancel', verifyToken, cancelReservation);

// 🔒 The Lock Route: Protect it with verifyToken
router.post('/lock', verifyToken, lockSeat); // 👈 FIXED: No "ticketController." prefix needed


router.post('/create-order', verifyToken, createPaymentOrder);

// ==========================================
// 🔄 PUT / DELETE ROUTES (Updates & Cleanup)
// ==========================================
// These endpoints were removed for security reasons.

// 3. EXPORT THE ROUTER NERVE
module.exports = router;