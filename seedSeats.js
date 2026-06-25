require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('./models/TicketModel');
const Event = require('./models/EventModel');

async function generateStadium() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to the Database Vault...");

        // 🎯 1. Target the Anirudh Event
        const currentEvent = await Event.findOne({ eventName: { $regex: 'ANIRUDH', $options: 'i' } });
        
        if (!currentEvent) {
            console.log("❌ Could not find the Anirudh event. Check the spelling in your database!");
            process.exit(1);
        }

        console.log(`🎟️ Building stadium seats for: ${currentEvent.eventName}`);

        const allSeats = [];

        // 🎯 2. Use the exact zone names your frontend is looking for!
        const zones = [
            { name: 'vip', rows: ['A', 'B'], seatsPerRow: 12, price: 8500 },
            { name: 'premium', rows: ['C', 'D', 'E'], seatsPerRow: 14, price: 4500 },
            { name: 'standard', rows: ['F', 'G', 'H', 'I'], seatsPerRow: 16, price: 2500 }
        ];

        for (let zone of zones) {
            for (let rowLabel of zone.rows) {
                for (let seatNum = 1; seatNum <= zone.seatsPerRow; seatNum++) {
                    allSeats.push({
                        event: currentEvent._id,   
                        zone: zone.name,           
                        rowLabel: rowLabel,        
                        seatNumber: seatNum,       
                        seatCode: `${rowLabel}${seatNum}`, 
                        price: zone.price,         
                        status: 'available'        
                    });
                }
            }
        }

        // Sweep old ghost tickets and insert the new ones
        await Ticket.deleteMany({ event: currentEvent._id });
        console.log("🧹 Swept away old broken tickets...");

        await Ticket.insertMany(allSeats);
        console.log(`✅ SUCCESS: Planted ${allSeats.length} perfect seats for Anirudh!`);

        process.exit();

    } catch (error) {
        console.error("❌ Factory crashed:", error);
        process.exit(1);
    }
}

generateStadium();