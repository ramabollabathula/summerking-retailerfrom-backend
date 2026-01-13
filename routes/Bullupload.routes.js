const express = require("express");
const router = express.Router();
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

// Ensure upload folder exists
const UPLOAD_DIR = "uploads/retailers";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer storage for local uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Helper: extract Drive file ID
function extractDriveId(url) {
  const match = url.match(/\/d\/(.*?)\//);
  return match ? match[1] : null;
}

// Helper: download Drive image to uploads folder
async function downloadDriveImage(fileId) {
  try {
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const response = await axios.get(url, { responseType: "arraybuffer" });

    const filename = `${Date.now()}-${fileId}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, response.data);
    return `/${UPLOAD_DIR}/${filename}`;
  } catch (err) {
    console.error("Drive download failed:", err);
    return null;
  }
}

// Main route
router.post("/", upload.array("shop_photos"), async (req, res) => {
  try {
    const files = req.files || [];
    let data = req.body.data;

    if (!data) return res.status(400).json({ msg: "Missing data" });

    if (!Array.isArray(data)) data = JSON.parse(data);

    for (const row of data) {
      if (!row.distributor_name || !row.shop_name) continue;

      // 1️⃣ Match local uploaded file
      let photoPath = null;
      const file = files.find((f) => f.originalname === row.shop_photo);
      if (file) photoPath = `/${UPLOAD_DIR}/${file.filename}`;

      // 2️⃣ If Drive URL provided, download
      else if (row.shop_photo && row.shop_photo.includes("drive.google.com")) {
        const fileId = extractDriveId(row.shop_photo);
        if (fileId) photoPath = await downloadDriveImage(fileId);
      }

      await db.query(
        `INSERT INTO retailers 
        (timestamp, distributor_name, location, salesman_name, shop_name, shop_address, contact_person, contact_mobile, shop_age, shop_photo, google_map_link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.timestamp || new Date().toISOString(),
          row.distributor_name,
          row.location,
          row.salesman_name,
          row.shop_name,
          row.shop_address,
          row.contact_person,
          row.contact_mobile,
          row.shop_age,
          photoPath,
          row.google_map_link,
        ]
      );
    }

    res.json({ msg: "Retailers imported successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "DB insert error", err });
  }
});

module.exports = router;
