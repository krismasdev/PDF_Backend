const mongoose = require("mongoose");

const pdfSchema = new mongoose.Schema({
  file: { type: String, required: true }, // Now stores file name
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Pdf", pdfSchema);