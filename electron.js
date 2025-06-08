const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const nameGenerator = require('./names');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, './build/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Generate a random name from the database
function generateRandomName() {
  const { dbFirstName, dbMiddleName, dbLastName } = nameGenerator;

  const firstName = dbFirstName[Math.floor(Math.random() * dbFirstName.length)];
  const middleName = dbMiddleName[Math.floor(Math.random() * dbMiddleName.length)];
  const lastName = dbLastName[Math.floor(Math.random() * dbLastName.length)];

  return `${firstName} ${middleName} ${lastName}`;
}

// Remove duplicate reviews based on review text
function deduplicateReviews(reviews) {
  const uniqueReviews = [];
  const seenTexts = new Set();

  for (const review of reviews) {
    if (!seenTexts.has(review.text)) {
      seenTexts.add(review.text);
      uniqueReviews.push(review);
    }
  }

  return uniqueReviews;
}

// Add random names to reviews
function addNamesToReviews(reviews) {
  return reviews.map(review => ({
    ...review,
    name: generateRandomName()
  }));
}

// Convert reviews to CSV format
function convertReviewsToCSV(reviews, productUrl = '') {
  // CSV header
  let csv = 'title,body,rating,review_date,reviewer_name,reviewer_email,product_url,picture_urls,product_id,product_handle\n';

  // Generate random date from 2024 onwards
  function generateRandomDate() {
    const start = new Date(2024, 0, 1);
    const end = new Date();
    const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return `${randomDate.getDate().toString().padStart(2, '0')}/${(randomDate.getMonth() + 1).toString().padStart(2, '0')}/${randomDate.getFullYear()}`;
  }

  // Add each review as a row
  reviews.forEach(review => {
    const title = "Review"; // Default title
    const body = review.text ? `"${review.text.replace(/"/g, '""')}"` : '';
    const rating = review.rating || 0;
    const reviewDate = generateRandomDate();
    const reviewerName = review.name ? `"${review.name.replace(/"/g, '""')}"` : '';
    const reviewerEmail = ''; // Not provided in our data
    const safeProductUrl = productUrl ? `"${productUrl.replace(/"/g, '""')}"` : '';
    const pictureUrls = review.images && review.images.length > 0 ? `"${review.images.join(', ')}"` : '';
    const productId = ''; // Not provided in our data
    const productHandle = ''; // Not provided in our data

    csv += `${title},${body},${rating},${reviewDate},${reviewerName},${reviewerEmail},${safeProductUrl},${pictureUrls},${productId},${productHandle}\n`;
  });

  return csv;
}

// Function to load cookies from file
function loadCookiesFromFile(filePath) {
  try {
    const cookiesString = fs.readFileSync(filePath, 'utf8');
    const cookies = JSON.parse(cookiesString);

    // Sanitize cookies to remove problematic properties
    return cookies.map(cookie => {
      // Keep only essential properties that Puppeteer accepts
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
  } catch (error) {
    console.error('Error loading cookies:', error);
    return null;
  }
}

// IPC handler for scraping reviews
ipcMain.handle('scrape-reviews', async (event, { url }) => {
  if (!url || !url.includes('aliexpress.com')) {
    return { error: 'Please provide a valid AliExpress URL.' };
  }

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();

    // Set realistic User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

    // Add settings to avoid detection
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver
      delete Object.getPrototypeOf(navigator).webdriver;

      // Modify userAgent on page
      Object.defineProperty(navigator, 'platform', {get: () => 'Win32'});

      // Add fake plugins to look like a real browser
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5].map(() => ({
          description: 'Chromium PDF Plugin',
          filename: 'internal-pdf-viewer',
          name: 'Chromium PDF Plugin'
        }))
      });
    });

    // Load and apply cookies
    const cookies = loadCookiesFromFile(path.join(__dirname, './aliexpress-cookies.json'));
    if (cookies && cookies.length > 0) {
      try {
        // Try to apply all cookies at once
        await page.setCookie(...cookies);
        console.log(`Cookies loaded successfully! (${cookies.length} cookies)`);
      } catch (error) {
        console.log('Error applying all cookies at once, trying one by one:', error.message);

        // If failed, try applying one by one
        let successCount = 0;
        for (const cookie of cookies) {
          try {
            await page.setCookie(cookie);
            successCount++;
          } catch (cookieError) {
            console.log(`Error applying cookie ${cookie.name}:`, cookieError.message);
          }
        }

        console.log(`Applied ${successCount} of ${cookies.length} cookies successfully.`);
      }
    } else {
      console.log('No valid cookies loaded. The site may show a captcha.');
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Scroll down to make sure the button is in view
    await page.evaluate(() => {
      window.scrollBy(0, 800);
    });

    await page.waitForTimeout(200);

    // Try to click "Ver mais" button
    try {
      const specificButtonSelector = 'button.comet-v2-btn.comet-v2-btn-slim.comet-v2-btn-large.v3--btn--KaygomA.comet-v2-btn-important[style*="min-width: 260px"]';
      await page.waitForSelector(specificButtonSelector, { timeout: 10000 })
        .catch(() => console.log('Specific "View more" button not found. Trying to continue...'));

      const viewMoreButton = await page.$(specificButtonSelector);
      if (viewMoreButton) {
        await viewMoreButton.click();
        await page.waitForTimeout(1500);

        // Implement infinite scroll in the modal to load all reviews
        await page.evaluate(async () => {
          // Find the scrollable container in the modal
          const modalSelectors = [
            '.review-modal',
            '.feedback-modal',
            '.comet-v2-drawer-content',
            '.comet-v2-modal-content',
            '[class*="modal"][class*="review"]',
            '[class*="drawer"][class*="review"]',
            '[role="dialog"]'
          ];

          // More specific content container selectors that might be scrollable
          const contentSelectors = [
            '.feedback-list-container',
            '.review-list-container',
            '.comet-v2-drawer-body',
            '.comet-v2-modal-body',
            '[class*="list"][class*="container"]',
            '[class*="feedback"][class*="container"]',
            '[class*="review"][class*="container"]',
            '[class*="scroller"]',
            '[class*="scroll-container"]'
          ];

          let scrollContainer = null;

          // First try to find the most specific scrollable container (the content container)
          for (const selector of contentSelectors) {
            const container = document.querySelector(selector);
            if (container && container.scrollHeight > container.clientHeight) {
              scrollContainer = container;
              console.log('Found scrollable content container:', selector);
              break;
            }
          }

          // If no specific content container found, try modal containers
          if (!scrollContainer) {
            for (const selector of modalSelectors) {
              const container = document.querySelector(selector);
              if (container && container.scrollHeight > container.clientHeight) {
                scrollContainer = container;
                console.log('Found scrollable modal container:', selector);
                break;
              }
            }
          }

          // If still no container found, try to find by checking all potential scrollable elements
          if (!scrollContainer) {
            const potentialScrollables = document.querySelectorAll('[style*="overflow"][style*="auto"], [style*="overflow"][style*="scroll"], [class*="scroll"]');
            for (const element of potentialScrollables) {
              if (element.scrollHeight > element.clientHeight) {
                scrollContainer = element;
                console.log('Found scrollable by style analysis');
                break;
              }
            }
          }

          // If no specific container found, use body as fallback
          if (!scrollContainer) {
            scrollContainer = document.body;
            console.log('Using document.body as fallback');
          }

          // Alternative scrolling technique using visible reviews
          const scrollUsingReviewElements = () => {
            const reviewElements = document.querySelectorAll('.list--itemContentTop--rXVH5KH, .list--itemContentTopLeft--jv7Zzf1');
            if (reviewElements.length > 0) {
              // Scroll to the last visible review
              const lastReview = reviewElements[reviewElements.length - 1];
              lastReview.scrollIntoView({ behavior: 'smooth', block: 'end' });
              return true;
            }
            return false;
          };

          // Function to scroll to the bottom of the container
          const scrollToBottom = () => {
            if (scrollContainer) {
              const prevScrollTop = scrollContainer.scrollTop;
              scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
              });

              // If scrollContainer didn't scroll, try alternative method
              if (scrollContainer.scrollTop === prevScrollTop) {
                return scrollUsingReviewElements();
              }
              return true;
            }
            return scrollUsingReviewElements();
          };

          // Function to check if new content was loaded
          const hasNewContent = (previousHeight, previousElementCount) => {
            const currentElementCount = document.querySelectorAll('.list--itemContentTop--rXVH5KH, .list--itemContentTopLeft--jv7Zzf1').length;
            return scrollContainer.scrollHeight > previousHeight || currentElementCount > previousElementCount;
          };

          let previousHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
          let previousElementCount = document.querySelectorAll('.list--itemContentTop--rXVH5KH, .list--itemContentTopLeft--jv7Zzf1').length;
          let noNewContentCount = 0;
          const MAX_NO_NEW_CONTENT = 5; // Increase attempts to ensure we've really reached the end

          // Keep scrolling until no new content is loaded multiple times
          while (noNewContentCount < MAX_NO_NEW_CONTENT) {
            // Scroll to the bottom
            const scrolled = scrollToBottom();
            if (!scrolled) {
              console.log('Unable to scroll further');
              break;
            }

            // Wait for new content to load
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Check if new content was loaded
            const currentHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
            const currentElementCount = document.querySelectorAll('.list--itemContentTop--rXVH5KH, .list--itemContentTopLeft--jv7Zzf1').length;

            console.log(`Previous height: ${previousHeight}, Current height: ${currentHeight}`);
            console.log(`Previous reviews: ${previousElementCount}, Current reviews: ${currentElementCount}`);

            if (hasNewContent(previousHeight, previousElementCount)) {
              console.log('New content detected, continuing scroll');
              previousHeight = currentHeight;
              previousElementCount = currentElementCount;
              noNewContentCount = 0; // Reset counter if new content was loaded
            } else {
              console.log(`No new content detected (${noNewContentCount + 1}/${MAX_NO_NEW_CONTENT})`);
              noNewContentCount++;
            }
          }

          console.log(`Finished scrolling. Total reviews found: ${document.querySelectorAll('.list--itemContentTop--rXVH5KH, .list--itemContentTopLeft--jv7Zzf1').length}`);
        });

        // Wait a bit for any final loading
        await page.waitForTimeout(2000);
      }
    } catch (error) {
      console.log('Error trying to click "View more" button:', error);
    }

    // Extract reviews
    const reviews = await page.evaluate(() => {
      const reviewsList = [];

      // Try to find reviews in various potential modal containers
      const modalSelectors = [
        '.review-modal',
        '.feedback-modal',
        '.comet-v2-drawer-content',
        '.comet-v2-modal-content',
        '[class*="modal"][class*="review"]',
        '[class*="drawer"][class*="review"]',
        '[role="dialog"]'
      ];

      let reviewItems = [];
      let foundInModal = false;

      // Try each possible modal selector
      for (const modalSelector of modalSelectors) {
        const modalReviews = document.querySelectorAll(`${modalSelector} .list--itemContentTop--rXVH5KH, ${modalSelector} .list--itemContentTopLeft--jv7Zzf1`);
        if (modalReviews && modalReviews.length > 0) {
          reviewItems = modalReviews;
          foundInModal = true;
          break;
        }
      }

      // If no reviews found in modal, try to get them from the main page
      if (!foundInModal) {
        reviewItems = document.querySelectorAll('.list--itemContentTop--rXVH5KH, .list--itemContentTopLeft--jv7Zzf1');
      }

      reviewItems.forEach(item => {
        // Check if this is a container or a standalone review
        const reviewContent = item.classList.contains('list--itemContentTopLeft--jv7Zzf1') ?
          item :
          item.querySelector('.list--itemContentTopLeft--jv7Zzf1');

        if (!reviewContent) return;

        // Extract rating
        const stars = reviewContent.querySelectorAll('.comet-icon-starreviewfilled').length;

        // Extract text
        const textElement = reviewContent.querySelector('.list--itemReview--d9Z9Z5Z');
        const text = textElement ? textElement.textContent.trim() : '';

        // Extract images
        const images = [];
        const thumbnailContainer = item.classList.contains('list--itemContentTop--rXVH5KH') ?
          item.querySelector('.list--itemThumbnails--TtUDHhl') :
          null;

        if (thumbnailContainer) {
          const imgElements = thumbnailContainer.querySelectorAll('img');
          imgElements.forEach(img => {
            if (img.src) {
              // Remove "_220x220.jpg_.webp" from the end of image URLs
              let imgUrl = img.src;
              if (imgUrl.endsWith('_220x220.jpg_.webp')) {
                imgUrl = imgUrl.replace('_220x220.jpg_.webp', '');
              }
              images.push(imgUrl);
            }
          });
        }

        reviewsList.push({ text, rating: stars, images });
      });

      return reviewsList;
    });

    // Close browser
    await browser.close();

    // Process reviews
    const uniqueReviews = deduplicateReviews(reviews);
    const reviewsWithNames = addNamesToReviews(uniqueReviews);

    return { success: true, reviews: reviewsWithNames, count: reviewsWithNames.length };
  } catch (error) {
    console.error('Error during scraping:', error);
    return { error: 'Error trying to extract reviews. Please try again.' };
  }
});

// IPC handler for exporting reviews as CSV
ipcMain.handle('export-reviews', async (event, { reviews, productUrl }) => {
  if (!reviews || !Array.isArray(reviews)) {
    return { error: 'Invalid review data.' };
  }

  try {
    const csv = convertReviewsToCSV(reviews, productUrl);

    // Show save dialog
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save CSV File',
      defaultPath: path.join(app.getPath('downloads'), 'reviews.csv'),
      filters: [
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    });

    if (!canceled && filePath) {
      fs.writeFileSync(filePath, csv);
      return { success: true, filePath };
    } else {
      return { canceled: true };
    }
  } catch (error) {
    console.error('Error generating CSV:', error);
    return { error: 'Error generating CSV file.' };
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});