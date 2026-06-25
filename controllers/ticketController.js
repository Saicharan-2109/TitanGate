const Ticket = require('../models/TicketModel');
const Event = require('../models/EventModel');
const Razorpay = require('razorpay');

// Unlock Razorpay using the keys from your Vault (.env)
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const bookNewTicket = async (req, res) => {
    try {
        const { event, zone, rowLabel, seatNumber, seatCode, price, status } = req.body;

        const chosenEvent = await Event.findById(event);
        if (!chosenEvent) {
            return res.status(404).json({ success: false, message: "Event ID not found." });
        }

        const currentTicketCount = await Ticket.countDocuments({ event });
        if (currentTicketCount >= chosenEvent.totalSeats) {
            return res.status(400).json({ success: false, message: "Maximum capacity reached." });
        }

        const newTicket = await Ticket.create({
            event, zone, rowLabel, seatNumber, seatCode, price, status
        });

        return res.status(201).json({ success: true, data: newTicket });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const getAllTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find().populate('event');
        return res.status(200).json({ success: true, count: tickets.length, data: tickets });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const buyTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedTicket = await Ticket.findByIdAndUpdate(id, { isBooked: true }, { new: true });
        if (!updatedTicket) return res.status(404).json({ success: false, message: "Ticket not found." });
        return res.status(200).json({ success: true, data: updatedTicket });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const removeTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTicket = await Ticket.findByIdAndDelete(id);
        if (!deletedTicket) return res.status(404).json({ success: false, message: "Ticket not found." });
        return res.status(200).json({ success: true, data: deletedTicket });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

const reserveSeat = async (req, res) => {
    try {
        const { event, seatNumber } = req.body;
        const ticket = await Ticket.findOne({ event, seatNumber });

        if (!ticket) return res.status(404).json({ success: false, message: "Seat does not exist." });
        if (ticket.status === 'booked') return res.status(400).json({ success: false, message: "Seat already booked." });
        if (ticket.status === 'reserved') return res.status(400).json({ success: false, message: "Seat is already reserved." });

        ticket.status = 'reserved';
        await ticket.save(); 
        return res.status(200).json({ success: true, data: ticket });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};





const lockSeat = async (req, res, next) => {
    try {
        const { ticketId } = req.body; 
        
        const lockExpirationTime = new Date(Date.now() + 5 * 60 * 1000); 

        const ticket = await Ticket.findOneAndUpdate(
            {
                _id: ticketId, 
                $or: [
                    { status: 'available' },
                    { status: 'reserved', lockedUntil: { $lt: new Date() } } 
                ]
            },
            {
                status: 'reserved', 
                user: req.user.id, // 🎯 THE FIX: You officially claim ownership here!
                lockedUntil: lockExpirationTime
            },
            { returnDocument: 'after' } // 🧹 THE SWAP: This stops the Mongoose terminal warning!
        );

        if (!ticket) {
            return res.status(400).json({ 
                success: false, 
                message: "Too slow! Someone else just reserved or booked this seat." 
            });
        }

        const io = req.app.get('socketio');
        io.emit('seatUpdate', { 
            action: 'locked', 
            ticketId: ticket._id, 
            eventId: ticket.event 
        });

        res.json({ success: true, message: "Seat reserved for 5 minutes!", ticket });
        
    } catch (error) {
        next(error);
    }
};





const confirmBooking = async (req, res) => {
    try {
        console.log("🔑 req.user =", req.user);
        console.log("🎫 req.body =", req.body);
        
        // 🎯 FIX 1: Ask for the exact ticketId instead of the first name
        const { ticketId } = req.body; 
        
        // 🎯 FIX 2: Search the Vault using the exact MongoDB ID
        const ticket = await Ticket.findById(ticketId); 
        
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found." });

        if (ticket.status === 'booked') {
            return res.status(400).json({ success: false, message: "Seat is already booked." });
        }

        ticket.status = 'booked';
        ticket.user = req.user.id; 
        await ticket.save();

        // 🎯 FIX 3: Grab the Walkie-Talkie and tell EVERYONE to paint it Red!
        const io = req.app.get('socketio');
        if (io) {
            io.emit('seatUpdate', { 
                action: 'booked', 
                ticketId: ticket._id, 
                eventId: ticket.event 
            });
        }

        res.status(200).json({ success: true, ticket });
    } catch (error) {
        console.error("Confirm Booking Error:", error);
        res.status(500).json({ success: false, message: "Failed to confirm booking." });
    }
};
const cancelReservation = async (req, res) => {
    try {
        // Expect ticketId from frontend
        const { ticketId } = req.body;
        if (!ticketId) {
            return res.status(400).json({ success: false, message: "ticketId missing in request body." });
        }

        // Find ticket by exact ID
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found." });
        }

        // 🔍 Debug: log both sides of the ownership check
        console.log("🔓 Cancel requested — ticket.user:", ticket.user, "| req.user.id:", req.user.id);

        // Verify ownership — use .toString() on both sides defensively
        if (ticket.user && ticket.user.toString() !== req.user.id.toString()) {
            return res.status(403).json({ success: false, message: "You are not authorized to cancel this reservation." });
        }

        if (ticket.status !== 'reserved') {
            return res.status(400).json({ success: false, message: "Seat is not currently reserved." });
        }

        // 🎯 FIX: Use null (not undefined) to actually clear Mongoose ObjectId/Date fields
        ticket.status = 'available';
        ticket.user = null;
        ticket.lockedUntil = null;
        await ticket.save();

        // Notify clients via socket.io
        const io = req.app.get('socketio');
        if (io) {
            io.emit('seatUpdate', {
                action: 'available',
                ticketId: ticket._id,
                eventId: ticket.event
            });
        }

        return res.status(200).json({ success: true, data: ticket });
    } catch (error) {
        console.error("❌ cancelReservation error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

const getMyTickets = async (req, res, next) => {
    try {
        // 1. Check the URL for page and limit (e.g., /my-tickets?page=2&limit=5)
        // If the user doesn't provide them, default to Page 1, showing 10 tickets.
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // 2. The Pagination Math (Calculate how many tickets to skip)
        const skip = (page - 1) * limit;

        // 3. Ask the database for exactly what we need
        const tickets = await Ticket.find({ user: req.user.id })
            .populate('event') // Get the event details too
            .skip(skip)        // Skip the ones from previous pages
            .limit(limit);     // Only take 'limit' amount of tickets

        // 4. Count the TOTAL tickets so the frontend knows how many pages exist
        const totalTickets = await Ticket.countDocuments({ user: req.user.id });
        const totalPages = Math.ceil(totalTickets / limit);

        // 5. Send it all back!
        res.json({
            success: true,
            data: tickets,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalTickets: totalTickets,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        // We pass the error to our brand new Global Error Catcher!
        next(error); 
    }
};

const createPaymentOrder = async (req, res) => {
    try {
        const { amount } = req.body; // We will pass the total amount from the frontend

        const options = {
            amount: amount * 100, // Razorpay needs the amount in paise (multiply by 100)
            currency: "INR",
            receipt: `tg_receipt_${Date.now()}`
        };

        const order = await razorpayInstance.orders.create(options);
        res.json({ success: true, order });
        
    } catch (error) {
        console.error("Razorpay Error:", error);
        res.status(500).json({ success: false, message: "Could not create payment bill." });
    }
};

module.exports = { 
    bookNewTicket, 
    getAllTickets, 
    buyTicket, 
    removeTicket,
    reserveSeat,
    confirmBooking,
    cancelReservation,
    getMyTickets,
    lockSeat,
    createPaymentOrder
};
