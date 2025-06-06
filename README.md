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
3. Tenta encontrar e clicar no botão "Ver mais" para carregar as avaliações
4. Extrai as avaliações e as exibe na interface, com nomes gerados aleatoriamente

## Notas

- Na versão de linha de comando, o navegador será aberto em modo visível (não headless) para facilitar a depuração
- Na versão web, o navegador é executado em modo headless no servidor
- Se o botão "Ver mais" não for encontrado, o programa tentará prosseguir com as avaliações disponíveis
- Certifique-se de que o link é de um produto da AliExpress que contém avaliações