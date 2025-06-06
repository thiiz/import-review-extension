const puppeteer = require('puppeteer');
const inquirer = require('inquirer');
const chalk = require('chalk');
const nameGenerator = require('./names');

/**
 * Generate a random name from the database
 * @returns {string} Random full name
 */
function generateRandomName() {
  const { dbFirstName, dbMiddleName, dbLastName } = nameGenerator;

  const firstName = dbFirstName[Math.floor(Math.random() * dbFirstName.length)];
  const middleName = dbMiddleName[Math.floor(Math.random() * dbMiddleName.length)];
  const lastName = dbLastName[Math.floor(Math.random() * dbLastName.length)];

  return `${firstName} ${middleName} ${lastName}`;
}

/**
 * Remove duplicate reviews based on review text
 * @param {Array} reviews - Reviews array
 * @returns {Array} Deduplicated reviews
 */
function deduplicateReviews(reviews) {
  const uniqueReviews = [];
  const seenTexts = new Set();

  for (const review of reviews) {
    // If we haven't seen this review text before, add it to results
    if (!seenTexts.has(review.text)) {
      seenTexts.add(review.text);
      uniqueReviews.push(review);
    }
  }

  return uniqueReviews;
}

/**
 * Scrape AliExpress reviews
 * @param {string} url - Product URL
 */
async function scrapeReviews(url) {
  console.log(chalk.blue('Iniciando scraping...'));

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log(chalk.green('Página carregada com sucesso!'));

    // Scroll down to make sure the button is in view
    await page.evaluate(() => {
      window.scrollBy(0, 800);
    });

    await page.waitForTimeout(1000);

    // Wait for the specific "Ver mais" button that opens the review modal
    console.log(chalk.blue('Procurando o botão "Ver mais" específico...'));

    const specificButtonSelector = 'button.comet-v2-btn.comet-v2-btn-slim.comet-v2-btn-large.v3--btn--KaygomA.comet-v2-btn-important[style*="min-width: 260px"]';
    await page.waitForSelector(specificButtonSelector, { timeout: 30000 })
      .catch(() => console.log(chalk.yellow('Botão "Ver mais" específico não encontrado. Tentando prosseguir...')));

    // Click the specific button that opens the modal
    const viewMoreButton = await page.$(specificButtonSelector);
    if (viewMoreButton) {
      console.log(chalk.blue('Clicando no botão "Ver mais" para abrir o modal de avaliações...'));
      await viewMoreButton.click();

      // Wait for the modal to load
      console.log(chalk.blue('Aguardando o modal de avaliações carregar...'));
      await page.waitForTimeout(1500);

      // Try to click "load more" button inside modal to load more reviews
      try {
        const modalLoadMoreSelector = '.comet-v2-button-plain, .comet-v2-btn-secondary, [class*="load-more"]';
        await page.waitForSelector(modalLoadMoreSelector, { timeout: 5000 });

        // Get all "load more" buttons in the modal
        const loadMoreButtons = await page.$$(modalLoadMoreSelector);

        if (loadMoreButtons.length > 0) {
          console.log(chalk.blue(`Encontrados ${loadMoreButtons.length} botões "carregar mais". Tentando clicar...`));

          // Click the "load more" button up to 3 times to load more reviews
          for (let i = 0; i < 3; i++) {
            const loadMoreVisible = await page.evaluate((selector) => {
              const buttons = Array.from(document.querySelectorAll(selector));
              const visibleButton = buttons.find(btn => {
                const style = window.getComputedStyle(btn);
                return style.display !== 'none' &&
                  style.visibility !== 'hidden' &&
                  btn.innerText.toLowerCase().includes('mais');
              });

              if (visibleButton) {
                visibleButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return true;
              }
              return false;
            }, modalLoadMoreSelector);

            if (loadMoreVisible) {
              console.log(chalk.blue(`Tentativa ${i + 1}: Clicando no botão "carregar mais"...`));
              await page.click(modalLoadMoreSelector);
              await page.waitForTimeout(2000);
            } else {
              console.log(chalk.yellow('Nenhum botão "carregar mais" visível encontrado.'));
              break;
            }
          }
        }
      } catch (error) {
        console.log(chalk.yellow('Nenhum botão "carregar mais" encontrado no modal ou erro ao clicar.'));
      }
    } else {
      console.log(chalk.yellow('Não foi possível encontrar o botão específico. Tentando continuar com avaliações visíveis...'));
    }

    // Extract reviews from the modal
    let reviews = await extractReviews(page);

    // Deduplicate reviews
    const originalCount = reviews.length;
    reviews = deduplicateReviews(reviews);
    console.log(chalk.yellow(`Removidas ${originalCount - reviews.length} avaliações duplicadas`));

    // Add random names to reviews
    reviews = addNamesToReviews(reviews);

    // Display results
    console.log(chalk.green(`\nForam encontradas ${reviews.length} avaliações únicas:`));
    reviews.forEach((review, index) => {
      console.log(chalk.cyan(`\n--- Avaliação ${index + 1} ---`));
      console.log(chalk.white(`Nome: ${review.name}`));
      console.log(chalk.white(`Avaliação: ${review.text}`));
      console.log(chalk.white(`Classificação: ${review.rating} estrelas`));

      if (review.images.length > 0) {
        console.log(chalk.white(`Imagens: ${review.images.join('\n         ')}`));
      }
    });

  } catch (error) {
    console.error(chalk.red('Erro durante o scraping:'), error);
  } finally {
    await browser.close();
  }
}

/**
 * Extract review data from the page
 * @param {Page} page - Puppeteer page
 * @returns {Array} Reviews data
 */
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
          if (img.src) images.push(img.src);
        });
      }

      reviews.push({ text, rating: stars, images });
    });

    return reviews;
  });
}

/**
 * Add random names to reviews
 * @param {Array} reviews - Reviews data
 * @returns {Array} Reviews with names
 */
function addNamesToReviews(reviews) {
  return reviews.map(review => ({
    ...review,
    name: generateRandomName()
  }));
}

/**
 * Main function
 */
async function main() {
  console.log(chalk.bold.green('=== AliExpress Review Scraper ===\n'));

  const { url } = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Digite o link do produto na AliExpress:',
      validate: input => input.includes('aliexpress.com') ? true : 'Por favor, insira um link válido da AliExpress'
    }
  ]);

  await scrapeReviews(url);
}

main().catch(console.error);
