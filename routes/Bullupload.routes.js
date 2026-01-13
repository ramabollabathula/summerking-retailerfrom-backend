const express = require("express");
const router = express.Router();
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

// ---------------------------
// Configuration
// ---------------------------
const UPLOAD_DIR = "uploads/retailers";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Serve uploads folder statically (optional, for frontend access)
router.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ---------------------------
// Multer setup
// ---------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ---------------------------
// Helpers
// ---------------------------

// Extract Drive file ID from any common Drive URL format
function extractDriveId(url) {
  let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Download Drive image to local folder
async function downloadDriveImage(fileId) {
  try {
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const response = await axios.get(url, { responseType: "arraybuffer" });

    const filename = `${Date.now()}-${fileId}.jpg`; // Can detect extension if needed
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, response.data);

    return `/${UPLOAD_DIR}/${filename}`;
  } catch (err) {
    console.warn("Drive download failed, storing URL directly:", err.message);
    return null;
  }
}

// ---------------------------
// Main Route
// ---------------------------
router.post("/", upload.array("shop_photos"), async (req, res) => {
  try {
    const files = req.files || [];
    let data = req.body.data;

    if (!data) return res.status(400).json({ msg: "Missing data" });
    if (!Array.isArray(data)) data = JSON.parse(data);

    for (const row of data) {
      // Basic validations
      if (!row.distributor_name || !row.shop_name) continue;

      // ---------------------------
      // Handle shop_photo
      // ---------------------------
      let photoPath = null;

      // 1️⃣ Match local uploaded file
      const file = files.find((f) => f.originalname === row.shop_photo);
      if (file) {
        photoPath = `/${UPLOAD_DIR}/${file.filename}`;
      }
      // 2️⃣ Google Drive URL
      else if (row.shop_photo && row.shop_photo.includes("drive.google.com")) {
        const fileId = extractDriveId(row.shop_photo);
        if (fileId) {
          const downloadedPath = await downloadDriveImage(fileId);
          photoPath = downloadedPath || row.shop_photo; // fallback to URL if download fails
        }
      }
      // 3️⃣ Any other URL
      else if (row.shop_photo) {
        photoPath = row.shop_photo;
      }

      // ---------------------------
      // Insert into DB
      // ---------------------------
      await db.query(
        `INSERT INTO retailers 
        (timestamp, distributor_name, location, salesman_name, shop_name, shop_address, contact_person, contact_mobile, shop_age, shop_photo, google_map_link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.timestamp || new Date().toISOString(),
          row.distributor_name,
          row.location || "",
          row.salesman_name || "",
          row.shop_name,
          row.shop_address || "",
          row.contact_person || "",
          row.contact_mobile || "",
          row.shop_age || null,
          photoPath,
          row.google_map_link || "",
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
