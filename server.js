const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
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

// API endpoint to export reviews as CSV
app.post('/api/export-reviews', (req, res) => {
  const { reviews, productUrl } = req.body;

  if (!reviews || !Array.isArray(reviews)) {
    return res.status(400).json({ error: 'Dados de avaliações inválidos.' });
  }

  try {
    const csv = convertReviewsToCSV(reviews, productUrl);

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

// Função para carregar cookies do arquivo
function loadCookiesFromFile(filePath) {
  try {
    const cookiesString = fs.readFileSync(filePath, 'utf8');
    const cookies = JSON.parse(cookiesString);

    // Sanitizar cookies para remover propriedades problemáticas
    return cookies.map(cookie => {
      // Manter apenas as propriedades essenciais que o Puppeteer aceita
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

      // Remover propriedades undefined ou null
      Object.keys(sanitizedCookie).forEach(key => {
        if (sanitizedCookie[key] === undefined || sanitizedCookie[key] === null) {
          delete sanitizedCookie[key];
        }
      });

      return sanitizedCookie;
    });
  } catch (error) {
    console.error('Erro ao carregar cookies:', error);
    return null;
  }
}

// API endpoint to scrape reviews
app.post('/api/scrape-reviews', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes('aliexpress.com')) {
    return res.status(400).json({ error: 'Por favor, forneça uma URL válida do AliExpress.' });
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

    // Definir User-Agent realista
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

    // Definir configurações adicionais para evitar detecção
    await page.evaluateOnNewDocument(() => {
      // Remover webdriver
      delete Object.getPrototypeOf(navigator).webdriver;

      // Modificar o userAgent na página
      Object.defineProperty(navigator, 'platform', {get: () => 'Win32'});

      // Adicionar plugins falsos para parecer um navegador real
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5].map(() => ({
          description: 'Chromium PDF Plugin',
          filename: 'internal-pdf-viewer',
          name: 'Chromium PDF Plugin'
        }))
      });
    });

    // Carregar e aplicar cookies
    const cookies = loadCookiesFromFile('./aliexpress-cookies.json');
    if (cookies && cookies.length > 0) {
      try {
        // Tentar aplicar todos os cookies de uma vez
        await page.setCookie(...cookies);
        console.log(`Cookies carregados com sucesso! (${cookies.length} cookies)`);
      } catch (error) {
        console.log('Erro ao aplicar todos os cookies de uma vez, tentando um por um:', error.message);

        // Se falhar, tentar aplicar um por um
        let successCount = 0;
        for (const cookie of cookies) {
          try {
            await page.setCookie(cookie);
            successCount++;
          } catch (cookieError) {
            console.log(`Erro ao aplicar cookie ${cookie.name}:`, cookieError.message);
          }
        }

        console.log(`Aplicados ${successCount} de ${cookies.length} cookies com sucesso.`);
      }
    } else {
      console.log('Nenhum cookie válido carregado. O site pode mostrar captcha.');
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