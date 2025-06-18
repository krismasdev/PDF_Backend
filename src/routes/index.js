// filepath: backend/src/routes/index.js
const express = require('express');
const userRouter = require('./user');
const pdfRouter = require('./pdf');
const router = express.Router();

router.use('/user', userRouter);

router.use('/pdf', pdfRouter);
router.get('/', (req, res) => {
  res.json({ message: 'Welcome to PDF Parser Backend!' });
});

module.exports = router;

