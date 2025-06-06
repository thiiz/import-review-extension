# AliExpress Review Scraper

Este é um web scraper que extrai avaliações de produtos na AliExpress e gera nomes aleatórios para os avaliadores usando uma base de dados de nomes.

## Funcionalidades

- Interface de linha de comando para inserir o link do produto
- Extração de avaliações incluindo:
  - Texto da avaliação
  - Classificação (estrelas)
  - Imagens (quando disponíveis)
- Geração automática de nomes aleatórios
- Suporte para clicar no botão "Ver mais" para carregar mais avaliações

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

Execute o aplicativo:

```bash
npm start
```

ou

```bash
yarn start
```

O programa irá:
1. Solicitar que você insira um link de produto válido da AliExpress
2. Abrir um navegador automatizado e navegar até a página
3. Tentar encontrar e clicar no botão "Ver mais" para carregar as avaliações
4. Extrair as avaliações e exibi-las no console, com nomes gerados aleatoriamente

## Notas

- O navegador será aberto em modo visível (não headless) para facilitar a depuração
- Se o botão "Ver mais" não for encontrado, o programa tentará prosseguir com as avaliações disponíveis
- Certifique-se de que o link é de um produto da AliExpress que contém avaliações