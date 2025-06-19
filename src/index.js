const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createServer } = require('@vercel/node');
const routes = require('../src/routes'); // Adjust path if needed

const app = express();

// Allow your frontend domain for CORS
app.use(
  cors({
    origin: 'https://pdf-wlfs.vercel.app',
    credentials: true,
  })
);
app.use(express.json());

mongoose.connect(
  process.env.MONGODB_URI,
  { useNewUrlParser: true, useUnifiedTopology: true }
);

app.use('/', routes);

module.exports = app;