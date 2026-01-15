const XLSX = require("xlsx");
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "retailers"
});

// Convert Excel date to JS Date
function excelDateToJSDate(excelDate) {
  return new Date((excelDate - 25569) * 86400 * 1000);
}

// Normalize Google Drive links
function normalizeDriveLink(url) {
  if (!url) return null;
  const match = url.match(/\/d\/(.*?)\//);
  if (match && match[1]) return `https://drive.google.com/uc?id=${match[1]}`;
  return url;
}

// Read Excel
const workbook = XLSX.readFile("./SUMMERKING Electricals – Retailer Information Form (Responses).xlsx");
const sheet = workbook.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: null });

// Clean column keys to remove Hindi and newlines
const cleanRows = rows.map(row => {
  const newRow = {};
  for (let key in row) {
    const cleanKey = key.split("\n").pop().trim(); // take English part
    newRow[cleanKey] = row[key];
  }
  return newRow;
});

// Insert into DB
cleanRows.forEach(row => {
  const data = {
    timestamp: row["Timestamp"] ? excelDateToJSDate(row["Timestamp"]) : null,
    distributor_name: row["Distributor name"] || null,
    location: row["Location/ city/market"] || null,
    salesman_name: row["Salesman name"] || null,
    shop_name: row["Retail shop name"] || null,
    shop_address: row["Full retail shop address / pin code"] || null,
    contact_person: row["Contact person name"] || null,
    contact_mobile: row["Contact person mobile number"] || null,
    shop_age: row["Shop age (in years)"] || null,
    shop_photo: normalizeDriveLink(row["Upload shop photo"]),
    google_map_link: normalizeDriveLink(row["Upload google map location link"])
  };

  db.query("INSERT INTO retailers SET ?", data, err => {
    if (err) console.error("Insert Error:", err);
  });
});

console.log("✔ Data Import Completed!");
db.end();
