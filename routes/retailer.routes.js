const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../config/db");

// File upload config
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  }
});
const upload = multer({ storage });

// Save Retailer
router.post("/", upload.single("shop_photo"), async (req, res) => {
  try {
    const {
      distributor_name,
      location,
      salesman_name,
      shop_name,
      shop_address,
      contact_person,
      contact_mobile,
      shop_age,
      google_map_link
    } = req.body;

    const photo = req.file ? req.file.filename : null;

    await db.query(
      `INSERT INTO retailers 
      (distributor_name, location, salesman_name, shop_name, shop_address, contact_person, contact_mobile, shop_age, shop_photo, google_map_link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        distributor_name,
        location,
        salesman_name,
        shop_name,
        shop_address,
        contact_person,
        contact_mobile,
        shop_age,
        photo,
        google_map_link
      ]
    );

    res.json({ success: true, message: "Retailer saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
