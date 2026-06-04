/**
 * Seed reference samples from uploads/ into the references/ folder.
 * Usage: node scripts/seed-references.js
 *
 * This moves files matching "Sample-Aadhaar-*.jpg" from uploads/
 * into references/AADHAAR_CARD/ with clean names sample-01.jpg etc.
 */
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads');
const refDir = path.join(__dirname, '../references');

const patterns = {
  AADHAAR_CARD: /Sample-Aadhaar.*\.(jpg|jpeg)$/i,
};

for (const [docType, pattern] of Object.entries(patterns)) {
  const dest = path.join(refDir, docType);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    console.log(`Created ${dest}`);
  }

  const files = fs.readdirSync(uploadsDir).filter(f => pattern.test(f));
  if (files.length === 0) {
    console.log(`No files matching ${pattern} found in uploads/`);
    continue;
  }

  files.sort();
  files.forEach((f, i) => {
    const src = path.join(uploadsDir, f);
    const ext = path.extname(f);
    const name = `sample-${String(i + 1).padStart(2, '0')}${ext}`;
    const dst = path.join(dest, name);
    fs.copyFileSync(src, dst);
    console.log(`  ${f} → ${name}`);
  });
  console.log(`Seeded ${files.length} files into ${docType}/`);
}

console.log('\nDone. Reference folders ready.');
