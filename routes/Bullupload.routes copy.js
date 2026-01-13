const express = require("express");
const router = express.Router();
const db = require("./../config/db");

// store from row 2 onwards
router.post("/", async (req, res) => {
  const { data } = req.body;
  if (!data || !Array.isArray(data))
    return res.status(400).json({ msg: "Invalid data" });

  try {
 for (const row of data) {
  
  // Skip Excel blank rows
  if (!row.distributor_name || row.distributor_name.trim() === "") {
    continue;
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
      row.shop_photo,
      row.google_map_link
    ]
  );
}


    res.json({ msg: "Retailers imported successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "DB insert error" });
  }
});



module.exports = router;
