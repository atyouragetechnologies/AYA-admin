const fs = require('fs');
const path = require('path');

const wranglerPath = path.join(process.cwd(), '.output', 'server', 'wrangler.json');
if (fs.existsSync(wranglerPath)) {
  let data = fs.readFileSync(wranglerPath, 'utf8');
  // Replace the compatibility date with a safe past date
  data = data.replace(/"compatibility_date"\s*:\s*"[^"]+"/, '"compatibility_date": "2024-04-01"');
  fs.writeFileSync(wranglerPath, data);
  console.log('[Deploy Web] Fixed compatibility_date in wrangler.json to 2024-04-01');
} else {
  console.log('[Deploy Web] Warning: wrangler.json not found in .output/server/');
}
