export const Constants = {
  db: {
    NAME: 'palan',
  },
  routes: {
    ROOT: '/',
    DASHBOARD: 'dashboard',
    PORTFOLIO: 'portfolio',
    STOCKS: 'stocks',
    PLAN: 'plan',
    SETTINGS: 'settings',
    IMPORT: 'import',
    EXPORT: 'export',
    DELETE: 'delete',
    ABOUT: 'about',
    PRIVACY: 'privacy',
    TERMS: 'terms',
    DISCLAIMER: 'disclaimer',
  },
  api: {
    MARKET_STATUS:
      'https://priceapi.moneycontrol.com/pricefeed/usMarket/stock/',
    STOCK_SEARCH:
      'https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php?classic=true&type=1&format=json&query=',
    STOCK_QUOTE: 'https://priceapi.moneycontrol.com/pricefeed/usMarket/stock/',
    STOCK_HISTORIC_CHART:
      'https://priceapi.moneycontrol.com/globaltechCharts/usMarket/stock/history?resolution=1&',
    STOCK_INTRA_DAY_CHART:
      'https://priceapi.moneycontrol.com/globaltechCharts/usMarket/stock/intra?duration=1D&firstCall=true&symbol=',
    FOREX:
      'https://api.moneycontrol.com/mcapi/v1/currency/getGlobalCurrencyRates',
    CURRENCY_LIST:
      'https://api.jsonblob.com/019c8a2f-f729-77ad-85e2-ab8828a65c08',
  },
  settings: {
    THEME: 'theme',
    COLOR_SCHEME: 'color_scheme',
    REFRESH_INTERVAL: 'refresh_interval',
  },
  placeholders: {
    NO_VALUE: '--',
  },
  currency: {
    iconUrl: {
      prefix: 'https://economictimes.indiatimes.com/photo/',
      suffix: '.cms',
    },
    allowed: ['USD', 'INR'],
  },
  configs: {
    defaults: {
      SEARCH_DEBOUNCE_TIME: 300, // milliseconds
      MIN_SEARCH_CHARS: 3,
      HTTP_REQUEST_TIMEOUT: 10_000, // milliseconds
      TOAST_DISMISS_TIMEOUT: 3_000, // milliseconds
    },
  },
};
