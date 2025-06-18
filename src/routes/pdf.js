const express = require('express');
const multer = require('multer');
const Pdf = require('../models/Pdf');
const jwt = require('jsonwebtoken');
const { createWorker } = require('tesseract.js');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { Readable } = require('stream');
const router = express.Router();

const JWT_SECRET = 'your_secret_key'; // Use your real secret
const upload = multer();

// Middleware to verify token and get userID
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: "No token provided." });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userID = decoded.id;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
}

// Helper: Convert buffer to readable stream
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// Helper: Render PDF page to PNG data URL (Node.js, using canvas)
async function renderPageToPng(page, scale = 1.5) {
  const { createCanvas } = require('canvas');
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/png');
}

// POST /pdf/send endpoint (parse PDF, OCR, save result)
router.post('/send', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const userID = req.userID;

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    // 1. Load PDF from buffer
    const loadingTask = pdfjsLib.getDocument({ data: file.buffer });
    const doc = await loadingTask.promise;

    // 2. Render each page to PNG and OCR
    const worker = await createWorker("eng");
    const result = {};
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const pngDataUrl = await renderPageToPng(page, 1.5);

      // Remove the data URL prefix to get the base64 string
      const base64 = pngDataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64, "base64");

      // OCR the PNG image buffer
      const { data: { text } } = await worker.recognize(buffer);
      result[i] = text;
    }
    await worker.terminate();

    // 3. Save to DB (file name, result, userID, created_at)
    const pdfDoc = new Pdf({
      file: file.originalname,
      result: result,
      userID: userID,
      created_at: new Date(),
    });

    await pdfDoc.save();

    // 4. Return parsed data as JSON to frontend
    res.json({ success: true, result });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET /pdf/history endpoint (get user's PDF parse history)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userID = req.userID;
    const pdfs = await Pdf.find({ userID }).select("file result created_at").lean();
    res.json({ success: true, data: pdfs });
  } catch {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;