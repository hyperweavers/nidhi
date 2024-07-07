export const Constants = {
  routes: {
    DASHBOARD: 'dashboard',
    PORTFOLIO: 'portfolio',
    STOCKS: 'stocks',
    SETTINGS: 'settings',
    IMPORT: 'import',
    EXPORT: 'export',
    DELETE: 'delete',
    ABOUT: 'about',
    PRIVACY: 'privacy',
    TERMS: 'terms',
  },
  api: {
    MARKET_STATUS: 'https://etapi.indiatimes.com/et-screener/index-byid',
    DASHBOARD:
      'https://mobilelivefeeds.indiatimes.com/ETMobileApps/mobile/dashboard',
    STOCK_SEARCH:
      'https://etsearch.indiatimes.com/etspeeds/etsearchMdata.ep?matchCompanyName=true&ticker=',
    STOCK_QUOTE:
      'https://marketservices.indiatimes.com/marketservices/company?outputType=json&companyid=',
    STOCK_CHART:
      'https://etelection.indiatimes.com/ET_Charts/india-market/stock/history?resolution=1D&',
    INDEX_QUOTES:
      'https://etapi.indiatimes.com/et-screener/index-byid?indexids=',
    INDEX_CHART:
      'https://etelection.indiatimes.com/ET_Charts/india-market/index/history?resolution=1D&',
  },
  settings: {
    THEME: 'theme',
    COLOR_SCHEME: 'color_scheme',
    REFRESH_INTERVAL: 'refresh_interval',
  },
};
