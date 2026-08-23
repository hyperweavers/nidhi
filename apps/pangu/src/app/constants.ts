export const Constants = {
  db: {
    NAME: 'pangu',
  },
  routes: {
    DASHBOARD: 'dashboard',
    PORTFOLIO: 'portfolio',
    STOCKS: 'stocks',
    INDICES: 'indices',
    WATCH_LIST: 'watch-list',
    SETTINGS: 'settings',
    IMPORT: 'import',
    EXPORT: 'export',
    DELETE: 'delete',
    TRANSACTIONS: 'transactions',
    ABOUT: 'about',
    PRIVACY: 'privacy',
    TERMS: 'terms',
    DISCLAIMER: 'disclaimer',
  },
  api: {
    MARKET_STATUS: 'https://etapi.indiatimes.com/et-screener/index-byid',
    DASHBOARD:
      'https://mobilelivefeeds.indiatimes.com/ETMobileApps/mobile/dashboard',
    STOCK_SEARCH:
      'https://etsearch.indiatimes.com/etspeeds/etsearchMdata.ep?matchCompanyName=true&ticker=',
    STOCK_SEARCH_SECONDARY:
      'https://appfeeds.moneycontrol.com/jsonapi/search/common?format=json&category=stock&query=',
    STOCK_QUOTE:
      'https://marketservices.indiatimes.com/marketservices/company?outputType=json&companyid=',
    STOCK_HISTORIC_CHART:
      'https://etapi.indiatimes.com/charts/mrkts/history?resolution=1D&countback=0&',
    STOCK_INTRA_DAY_CHART:
      'https://priceapi.moneycontrol.com/techCharts/intra?resolution=1&symbol=',
    INDEX_QUOTE:
      'https://etapi.indiatimes.com/et-screener/index-summary?indexId=',
    INDEX_CONSTITUENTS:
      'https://etmarketsapis.indiatimes.com/ET_Stats/getIndexByIds?pagesize=1000&sortorder=desc&company=true&',
    INDEX_HISTORIC_CHART:
      'https://etapi.indiatimes.com/charts/mrkts/history?resolution=1D&countback=0&',
    INDEX_INTRA_DAY_CHART:
      'https://priceapi.moneycontrol.com/techCharts/intra?resolution=1&symbol=',
    STOCK_INTRA_DAY_PEER_CHART:
      'https://etapi.indiatimes.com/charts/peercharts?datatype=intraday&scripcodetype=company&exchangeid=50&scripcode=',
    STOCK_HISTORIC_PEER_CHART:
      'https://etapi.indiatimes.com/charts/peercharts?scripcodetype=company&exchangeid=50&',
  },
  settings: {
    THEME: 'theme',
    COLOR_SCHEME: 'color_scheme',
    REFRESH_INTERVAL: 'refresh_interval',
  },
  placeholders: {
    NO_VALUE: '--',
  },
  configs: {
    defaults: {
      WATCH_LIST_NAME: 'My Watch List',
      TOAST_DISMISS_TIMEOUT: 3_000, // milliseconds
      SEARCH_DEBOUNCE_TIME: 300, // milliseconds
      MIN_SEARCH_CHARS: 3,
      FLOWBITE_INITIALIZATION_DELAY: 200, // milliseconds
      FORM_ERROR_CLEAR_DELAY: 2_000, // milliseconds
      HTTP_REQUEST_TIMEOUT: 10_000, // milliseconds
      WINDOW_RESIZE_DEBOUNCE_TIME: 500, // milliseconds
    },
  },
};
