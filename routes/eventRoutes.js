const express = require('express');
const router = express.Router();
// 1. IMPORT BOTH THE CREATOR AND THE FETCHERS!
const { createNewEvent, getAllEvents } = require('../controllers/eventController');
const verifyToken = require('../middlewares/verifyToken');
const isAdmin = require('../middlewares/isAdmin');

// 2. THE FETCH ROUTE (This kills our frontend 404 error!)
router.get('/', getAllEvents);

// When an Admin hits POST on the base URL, make a new event billboard
router.post('/', verifyToken, isAdmin, createNewEvent);

module.exports = router;