const Event = require('../models/EventModel');

// 1. Existing Recipe to build a brand new Master Event/Billboard
const createNewEvent = async (req, res) => {
    try {
        const { eventName, venue, eventDate, totalSeats } = req.body;
        const newEvent = await Event.create({ eventName, venue, eventDate, totalSeats });
        return res.status(201).json({
            success: true,
            message: "Master Event Billboard successfully created!",
            data: newEvent
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// 🎯 NEW: Recipe to grab all Event Billboards from MongoDB
const getAllEvents = async (req, res) => {
    try {
        // Look inside the Event collection and find everything
        const allEvents = await Event.find({});
        
        // Send them back to the frontend in a happy success packet
        return res.status(200).json({
            success: true,
            message: "All live event billboards retrieved successfully!",
            data: allEvents
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// 📦 EXPORT WEAPONS (Make sure to add getAllEvents here!)
module.exports = { createNewEvent, getAllEvents };