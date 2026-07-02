require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('./models/TicketModel');
const Event = require('./models/EventModel');

async function generateStadium() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📦 Connected to the Database Vault...");

        // 🎯 Grab ALL events from the database
        const allEvents = await Event.find({});
        
        if (allEvents.length === 0) {
            console.log("❌ No events found in the database! Create some events first.");
            process.exit(1);
        }

        console.log(`🎟️ Found ${allEvents.length} event(s). Seeding seats for ALL of them...`);

        // 🎯 The zone blueprint — same layout for every event
        const zones = [
            { name: 'vip', rows: ['A', 'B'], seatsPerRow: 12, price: 8500 },
            { name: 'premium', rows: ['C', 'D', 'E'], seatsPerRow: 14, price: 4500 },
            { name: 'standard', rows: ['F', 'G', 'H', 'I'], seatsPerRow: 16, price: 2500 }
        ];

        for (const currentEvent of allEvents) {
            console.log(`\n🏟️ Building seats for: ${currentEvent.eventName}`);

            const allSeats = [];

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

            // Sweep old tickets for this event and insert new ones
            await Ticket.deleteMany({ event: currentEvent._id });
            console.log(`  🧹 Swept away old tickets for ${currentEvent.eventName}`);

            await Ticket.insertMany(allSeats);
            console.log(`  ✅ Planted ${allSeats.length} seats for ${currentEvent.eventName}!`);
        }

        console.log(`\n🎉 ALL DONE! Every event now has a full stadium of seats.`);
        process.exit();

    } catch (error) {
        console.error("❌ Factory crashed:", error);
        process.exit(1);
    }
}

generateStadium();