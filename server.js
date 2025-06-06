const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer');
const nameGenerator = require('./names');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'build')));

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

// Extract reviews from page
async function extractReviews(page) {
  return await page.evaluate(() => {
    const reviews = [];

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

      reviews.push({ text, rating: stars, images });
    });

    return reviews;
  });
}

// Add random names to reviews
function addNamesToReviews(reviews) {
  return reviews.map(review => ({
    ...review,
    name: generateRandomName()
  }));
}

// Convert reviews to CSV format
function convertReviewsToCSV(reviews) {
  // CSV header
  let csv = 'Nome,Avaliação,Texto,Imagens\n';

  // Add each review as a row
  reviews.forEach(review => {
    const name = review.name ? `"${review.name.replace(/"/g, '""')}"` : '';
    const rating = review.rating || 0;
    const text = review.text ? `"${review.text.replace(/"/g, '""')}"` : '';
    const images = review.images && review.images.length > 0 ? `"${review.images.join(', ')}"` : '';

    csv += `${name},${rating},${text},${images}\n`;
  });

  return csv;
}

// API endpoint to export reviews as CSV
app.post('/api/export-reviews', (req, res) => {
  const { reviews } = req.body;

  if (!reviews || !Array.isArray(reviews)) {
    return res.status(400).json({ error: 'Dados de avaliações inválidos.' });
  }

  try {
    const csv = convertReviewsToCSV(reviews);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="avaliacoes.csv"');

    // Send CSV data
    res.send(csv);
  } catch (error) {
    console.error('Erro ao gerar CSV:', error);
    res.status(500).json({ error: 'Erro ao gerar arquivo CSV.' });
  }
});

// API endpoint to scrape reviews
app.post('/api/scrape-reviews', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes('aliexpress.com')) {
    return res.status(400).json({ error: 'Por favor, forneça uma URL válida do AliExpress.' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
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
        .catch(() => console.log('Botão "Ver mais" específico não encontrado. Tentando prosseguir...'));

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
      console.log('Erro ao tentar clicar no botão "Ver mais":', error);
    }

    // Extract reviews
    let reviews = await extractReviews(page);

    // Close browser
    await browser.close();

    // Process reviews
    reviews = deduplicateReviews(reviews);
    reviews = addNamesToReviews(reviews);

    res.json({ success: true, reviews, count: reviews.length });
  } catch (error) {
    console.error('Erro durante o scraping:', error);
    res.status(500).json({ error: 'Erro ao tentar extrair avaliações. Por favor, tente novamente.' });
  }
});

// Always return the main index.html for any request that doesn't match an API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});