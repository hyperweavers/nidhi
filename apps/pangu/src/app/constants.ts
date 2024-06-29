export const Constants = {
  routes: {
    DASHBOARD: 'dashboard',
    PORTFOLIO: 'portfolio',
    SETTINGS: 'settings',
    IMPORT: 'import',
    EXPORT: 'export',
    DELETE: 'delete',
    ABOUT: 'about',
    PRIVACY: 'privacy',
    TERMS: 'terms',
  },
  api: {
    DASHBOARD:
      'https://mobilelivefeeds.indiatimes.com/ETMobileApps/mobile/dashboard',
    STOCK_SEARCH:
      'https://etsearch.indiatimes.com/etspeeds/etsearchMdata.ep?matchCompanyName=true&ticker=',
    STOCK_QUOTE:
      'https://marketservices.indiatimes.com/marketservices/company?outputType=json&companyid=',
    INDEX_QUOTES:
      'https://etapi.indiatimes.com/et-screener/index-byid?indexids=',
    MARKET_STATUS:
      'https://etapi.indiatimes.com/et-screener/index-byid',
  },
  settings: {
    THEME: 'theme',
  },
};
