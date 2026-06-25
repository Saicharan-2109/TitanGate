const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: [true, "An event must have a name, buddy!"]
    },
    venue: {
        type: String,
        required: [true, "Where is the concert happening? Venue required"]
    },
    eventDate: {
        type: String, 
        required: [true, "You need to specify the date of the event"]
    },
    totalSeats: {
        type: Number,
        default: 100
    }
});

module.exports = mongoose.model('Event', eventSchema);