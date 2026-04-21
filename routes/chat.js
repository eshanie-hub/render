const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');

router.post('/', chatController.handleChat);

module.exports = router;