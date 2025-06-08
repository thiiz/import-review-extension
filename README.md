# AliExpress Review Scraper

An Electron-based application for scraping product reviews from AliExpress. This app allows you to extract reviews with ratings, text content, and images, then export them to CSV format.

## Features

- Extract product reviews from AliExpress product pages
- Support for reviews with text and images
- Filter reviews by rating, content, and other criteria
- Export selected reviews to CSV format
- Support for cookie authentication to avoid captchas

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

## Usage

### Running in Development Mode

```bash
npm start
```

This will start both the React development server and the Electron app.

### Exporting Cookies (Recommended)

To avoid captchas, it's recommended to first export your cookies:

```bash
npm run export-cookies
```

This will open a browser window where you can login to AliExpress. After login, the cookies will be saved automatically and used in future scraping operations.

### Building for Production

```bash
npm run package
```

This will build both the React app and package it with Electron for your platform.

## How to Use

1. Launch the app
2. Enter the URL of an AliExpress product page in the input field
3. Click "Obter Avaliações" (Get Reviews)
4. Wait for the scraping process to complete
5. Use the "Exportar CSV" button to export reviews
6. Set product URL and select which reviews to include in the export
7. Save the CSV file to your desired location

## Requirements

- Node.js 14+
- npm 6+

## License

MIT