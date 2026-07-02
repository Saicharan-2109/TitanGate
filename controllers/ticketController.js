const Ticket = require('../models/TicketModel');
const Event = require('../models/EventModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const qrcode = require('qrcode');  
const sendEmail = require('../utils/sendEmail'); 

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
        // 🧹 AUTO-CLEANUP: Before sending the seats to anyone, unlock any expired reservations!
        await Ticket.updateMany(
            { status: 'reserved', lockedUntil: { $lt: new Date() } },
            { $set: { status: 'available', user: null, lockedUntil: null } }
        );

        const tickets = await Ticket.find().populate('event');
        return res.status(200).json({ success: true, count: tickets.length, data: tickets });
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
        // 1. Grab the ticket ID AND the Razorpay receipt details from the frontend
        const { ticketId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body; 
        
        // 2. We MUST have all the Razorpay details to proceed
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed. Missing receipt details." });
        }

        // 3. THE MATH: We use our Secret Key to generate our own signature
        const bodyText = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(bodyText.toString())
            .digest('hex');

        // 4. Compare our math to Razorpay's math. If they don't match, it's a hacker!
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Fraud detected! Invalid payment signature." });
        }

        // 5. The math matched! They actually paid. Let's find the ticket.
        const ticket = await Ticket.findById(ticketId); 
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found." });

        if (ticket.status === 'booked') {
            return res.status(400).json({ success: false, message: "Seat is already booked." });
        }

        // 6. Give them the ticket!
        ticket.status = 'booked';
        ticket.user = req.user.id; 
        await ticket.save();

               // 🎨 6A. Generate the QR Code (It turns the Ticket ID into an image string)
        const qrDataUrl = await qrcode.toDataURL(ticket._id.toString());
        ticket.qrCode = qrDataUrl; // Save the image to the database!
        
        await ticket.save();
        // ✉️ 6B. Send the Email!
        // We need the user's email, but we only have req.user.id. Let's fetch the User.
        const User = require('../models/UserModel'); 
        const user = await User.findById(req.user.id);
        if (user) {
            const emailHtml = `
                <div style="font-family: Arial; padding: 20px; background-color: #1C1B1F; color: #EAE3D2;">
                    <h1 style="color: #C84B43;">TitanGate 🎟️</h1>
                    <h2>Booking Confirmed, ${user.name}!</h2>
                    <p>Thank you for your purchase. Your seat has been secured.</p>
                    <div style="background: #2A292F; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Seat:</strong> ${ticket.seatNumber}</p>
                        <p><strong>Code:</strong> ${ticket.seatCode}</p>
                    </div>
                    <p>Please present this QR code at the gate:</p>
                    <img src="cid:ticket_qr" alt="Ticket QR Code" style="border: 4px solid white; border-radius: 10px;" />
                </div>
            `;
            // Hand the letter to the mailman! (We don't 'await' it because we don't want to slow down the frontend)
            sendEmail({
                email: user.email,
                subject: '🎟️ Your TitanGate Ticket is Confirmed!',
                html: emailHtml,
                attachments: [
                    {
                        filename: 'qrcode.png',
                        content: qrDataUrl.split(',')[1],
                        encoding: 'base64',
                        cid: 'ticket_qr' // This matches the cid in the img src!
                    }
                ]
            }).catch(err => console.error("Mailman dropped the letter:", err));
        }




        // 7. Tell everyone else in the stadium that the seat is gone
        const io = req.app.get('socketio');
        if (io) {
            io.emit('seatUpdate', { action: 'booked', ticketId: ticket._id, eventId: ticket.event });
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
    reserveSeat,
    confirmBooking,
    cancelReservation,
    getMyTickets,
    lockSeat,
    createPaymentOrder
};
