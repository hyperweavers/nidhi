export const Constants = {
  routes: {
    DASHBOARD: 'dashboard',
    PORTFOLIO: 'portfolio',
    TRANSACTION: 'transaction',
    ABOUT: 'about',
  },
  api: {
    DASHBOARD:
      'https://mobilelivefeeds.indiatimes.com/ETMobileApps/mobile/dashboard',
    STOCK_SEARCH:
      'https://etsearch.indiatimes.com/etspeeds/etsearchMdata.ep?matchCompanyName=true&ticker=',
    STOCK_QUOTE:
      'https://marketservices.indiatimes.com/marketservices/company?outputType=json&companyid=',
    MARKET_STATUS:
      'https://json.bselivefeeds.indiatimes.com/ET_Community/holidaylist?_=',
  },
};
