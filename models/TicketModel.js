const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Make sure this matches exactly what you named your User model
        default: null
    },
    // 🔥 ADDED: Frontend needs this to know which section to draw in!
    zone: {
        type: String,
        required: true
    },
    // 🔥 ADDED: Frontend needs this to group the seats into rows (e.g., "A")
    rowLabel: {
        type: String,
        required: true
    },
    seatNumber: {
        type: String,
        required: true
    },
    // 🔥 ADDED: Frontend uses this for the unique seat ID (e.g., "A1")
    seatCode: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    // 🔥 THE NEW HASHIRA UPGRADE: Strict state validation control!
    status: {
        type: String,
        enum: ['available', 'reserved', 'booked'],
        default: 'available',
        required: true
    },
    lockedUntil: {
        type: Date,
        default: null // <-- This holds the 5-minute timer
    }
   
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);