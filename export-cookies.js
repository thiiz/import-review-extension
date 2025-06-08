const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

// Function to sanitize cookies before saving
function sanitizeCookies(cookies) {
  return cookies.map(cookie => {
    // Keep only the essential properties that Puppeteer accepts
    const sanitizedCookie = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite
    };

    // Remove undefined or null properties
    Object.keys(sanitizedCookie).forEach(key => {
      if (sanitizedCookie[key] === undefined || sanitizedCookie[key] === null) {
        delete sanitizedCookie[key];
      }
    });

    return sanitizedCookie;
  });
}

// Function to export cookies
async function exportCookies() {
  console.log('Starting browser for login and cookie export...');

  const browser = await puppeteer.launch({
    headless: false, // Visible so you can login
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();

  // Set User-Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

  // Go to AliExpress login page
  await page.goto('https://login.aliexpress.com/', { waitUntil: 'networkidle2' });

  console.log('\nPlease login manually in the browser window that opened.');
  console.log('After logging in, you will have 30 seconds to browse the site (optional).');
  console.log('After that, the cookies will be saved automatically.\n');

  // Wait enough time for manual login (1 minute)
  await new Promise(resolve => setTimeout(resolve, 60000));

  // Check if logged in by navigating to the main page
  await page.goto('https://www.aliexpress.com/', { waitUntil: 'networkidle2' });

  // Extract cookies
  const cookies = await page.cookies();

  // Sanitize cookies before saving
  const sanitizedCookies = sanitizeCookies(cookies);

  // Ensure the cookies are saved in the app's directory
  const cookiesPath = path.join(__dirname, 'aliexpress-cookies.json');

  // Save cookies to file
  fs.writeFileSync(cookiesPath, JSON.stringify(sanitizedCookies, null, 2));

  console.log(`\nCookies saved successfully to 'aliexpress-cookies.json'!`);
  console.log(`Total of ${sanitizedCookies.length} cookies exported.`);

  await browser.close();
  console.log('Browser closed. You can use these cookies in the scraper now.\n');
}

// Run function
exportCookies().catch(console.error);