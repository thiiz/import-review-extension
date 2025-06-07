# AliExpress Review Scraper

Este é um web scraper que extrai avaliações de produtos na AliExpress e gera nomes aleatórios para os avaliadores usando uma base de dados de nomes.

## Funcionalidades

- Interface web para inserir o link do produto
- Extração de avaliações incluindo:
  - Texto da avaliação
  - Classificação (estrelas)
  - Imagens (quando disponíveis)
- Geração automática de nomes aleatórios
- Visualização das avaliações em cards com design moderno
- Possibilidade de visualizar as imagens das avaliações em tamanho maior
- **Prevenção de Captchas** com técnicas de stealth e cookies de sessão
- **Exportação de CSV** para importação em outras plataformas

## Requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

## Instalação

1. Clone este repositório ou baixe os arquivos
2. Navegue até o diretório do projeto
3. Instale as dependências:

```bash
npm install
```

ou

```bash
yarn install
```

## Como Usar

### Exportar Cookies (Recomendado para evitar Captchas)

Antes de usar o scraper, recomendamos exportar cookies de uma sessão autenticada:

```bash
node export-cookies.js
```

Isso abrirá um navegador onde você deve:
1. Fazer login manualmente na sua conta AliExpress
2. Aguardar 2 minutos para o script exportar os cookies
3. O arquivo `aliexpress-cookies.json` será criado automaticamente

### Aplicação Web (Frontend + Backend)

Para iniciar o servidor e a aplicação web:

```bash
npm start
```

Acesse `http://localhost:5000` em seu navegador para utilizar a aplicação web.

### CLI (Command Line Interface)

Para utilizar apenas a versão de linha de comando:

```bash
npm run scrape
```

## Modo de Funcionamento

A aplicação:
1. Recebe a URL de um produto do AliExpress
2. Abre um navegador automatizado e navega até a página
3. Aplica técnicas anti-detecção e carrega cookies (se disponíveis)
4. Tenta encontrar e clicar no botão "Ver mais" para carregar as avaliações
5. Extrai as avaliações e as exibe na interface, com nomes gerados aleatoriamente
6. Permite exportar as avaliações como CSV

## Técnicas Anti-Captcha

Este scraper implementa diversas técnicas para evitar detecção:

- **Puppeteer Stealth**: Usa o plugin `puppeteer-extra-plugin-stealth` para mascarar sinais de automação
- **Cookies de Sessão**: Reutiliza cookies de uma sessão autenticada real
- **User-Agent Realista**: Simula um navegador comum e moderno
- **Comportamento Humanizado**: Implementa delays e interações naturais

## Exportação de CSV

É possível exportar as avaliações como CSV para importação em outras plataformas, como Shopify. O formato exportado inclui:
- Título da avaliação
- Corpo do texto
- Classificação (estrelas)
- Data da avaliação (gerada aleatoriamente)
- Nome do avaliador (gerado aleatoriamente)
- URLs das imagens

## Notas

- Se enfrentar captchas frequentes, execute o script `export-cookies.js` para gerar novos cookies
- Os cookies expiram com o tempo, então pode ser necessário regenerá-los periodicamente
- Na versão de linha de comando, o navegador será aberto em modo visível (não headless) para facilitar a depuração
- Certifique-se de que o link é de um produto da AliExpress que contém avaliações