const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

// Função para sanitizar cookies antes de salvar
function sanitizeCookies(cookies) {
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
}

// Função para exportar cookies
async function exportCookies() {
  console.log('Iniciando o navegador para fazer login e exportar cookies...');

  const browser = await puppeteer.launch({
    headless: false, // Visível para você fazer login
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();

  // Configurar User-Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

  // Ir para a página de login do AliExpress
  await page.goto('https://login.aliexpress.com/', { waitUntil: 'networkidle2' });

  console.log('\nPor favor, faça login manualmente na janela do navegador que abriu.');
  console.log('Após fazer login, você terá 30 segundos para navegar um pouco no site (opcional).');
  console.log('Depois disso, os cookies serão salvos automaticamente.\n');

  // Esperar tempo suficiente para login manual (1 minutos)
  await new Promise(resolve => setTimeout(resolve, 60000));

  // Verificar se está logado navegando para a página principal
  await page.goto('https://www.aliexpress.com/', { waitUntil: 'networkidle2' });

  // Extrair cookies
  const cookies = await page.cookies();

  // Sanitizar cookies antes de salvar
  const sanitizedCookies = sanitizeCookies(cookies);

  // Salvar cookies em arquivo
  fs.writeFileSync('aliexpress-cookies.json', JSON.stringify(sanitizedCookies, null, 2));

  console.log(`\nCookies salvos com sucesso em 'aliexpress-cookies.json'!`);
  console.log(`Total de ${sanitizedCookies.length} cookies exportados.`);

  await browser.close();
  console.log('Navegador fechado. Você pode usar esses cookies no scraper agora.\n');
}

// Executar função
exportCookies().catch(console.error);