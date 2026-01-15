const XLSX = require('xlsx');

// ── Configuration ───────────────────────────────────────────────
const INPUT_FILE = 'SUMMERKING Electricals – Retailer Information Form (Responses).xlsx';
const OUTPUT_NEEDED = 'Needed_Map_Links.xlsx';
const OUTPUT_HAS_VALID = 'Has_Valid_Map_Links.xlsx';

// ── Improved detection: Drive, text, empty → Needed ────────────
function needsMapLink(value) {
  if (!value || typeof value !== 'string') return true;

  const s = value.trim().toLowerCase();

  // Clearly invalid / not location
  if (
    s === '' ||
    s.includes('drive.google.com') ||
    s.includes('drive.google') ||
    s.includes('needed') ||
    s.length < 15 ||
    (s.includes('google.com') && !s.includes('maps') && !s.includes('goo.gl'))
  ) {
    return true; // → Needed
  }

  // All official Google Maps short links → treat as VALID location
  if (s.includes('maps.app.goo.gl')) {
    return false; // → Has valid map (Not Needed)
  }

  // Full/long Google Maps URLs → check for coordinates or strong indicators
  if (s.includes('google.com/maps')) {
    const hasCoordSigns = 
      s.includes('@') ||
      s.includes('!3d') ||
      s.includes('!4d') ||
      s.includes('data=!') ||
      s.includes('place/') ||
      /query=[+-]?\d+\.\d+,[+-]?\d+\.\d+/.test(s);

    return !hasCoordSigns; // Needed only if really no location info
  }

  // Anything else → assume needed (rare case)
  return true;
}

// ── Main function ───────────────────────────────────────────────
function processRetailerExcel() {
  try {
    const workbook = XLSX.readFile(INPUT_FILE);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: true
    });

    if (rows.length < 2) {
      console.log('No data found in the file.');
      return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find map column (try exact + flexible search)
    let mapColIndex = headers.indexOf(
      "Google Map लोकेशन की लिंक अपलोड करें\nUpload google map location link"
    );

    if (mapColIndex === -1) {
      mapColIndex = headers.findIndex(h =>
        typeof h === 'string' &&
        h.includes('Google Map') &&
        h.includes('लिंक') &&
        h.includes('Upload google map')
      );
    }

    if (mapColIndex === -1) {
      console.error('Google Map column not found!');
      console.log('Available headers:');
      headers.forEach((h, i) => console.log(`${i + 1}) ${h}`));
      return;
    }

    console.log(`Map column found at index ${mapColIndex} → "${headers[mapColIndex]}"`);

    const neededRows = [headers];
    const validRows = [headers];

    let countNeeded = 0;
    let countValid = 0;

    dataRows.forEach(row => {
      const mapValue = (row[mapColIndex] || '').toString().trim();

      if (needsMapLink(mapValue)) {
        neededRows.push(row);
        countNeeded++;
      } else {
        validRows.push(row);
        countValid++;
      }
    });

    // Save results
    const wbNeeded = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbNeeded, XLSX.utils.aoa_to_sheet(neededRows), "Needed");

    const wbValid = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbValid, XLSX.utils.aoa_to_sheet(validRows), "Valid Map");

    XLSX.writeFile(wbNeeded, OUTPUT_NEEDED);
    XLSX.writeFile(wbValid, OUTPUT_HAS_VALID);

    console.log('\n' + '='.repeat(60));
    console.log('                PROCESSING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total data rows:          ${dataRows.length}`);
    console.log(`Rows NEEDING map link:    ${countNeeded} → ${OUTPUT_NEEDED}`);
    console.log(`Rows WITH valid location: ${countValid} → ${OUTPUT_HAS_VALID}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Error:', err.message);
    if (err.code === 'ENOENT') {
      console.error(`File not found → ${INPUT_FILE}`);
    }
  }
}

// Run it!
console.log('Processing retailer responses...');
processRetailerExcel();