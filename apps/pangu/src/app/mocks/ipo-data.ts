import type {
  BsResponse,
  CfResponse,
  IpoCalendarResponse,
  IpoDetailsResponse,
  IpoLinksResponse,
  ListedIposOverviewResponse,
  ListingSoonIpoResponse,
  OpenIpoOverviewResponse,
  PnlResponse,
  QuarterlyResponse,
  UpcomingIpoOverviewResponse,
} from '../models/ipo';

const now = Date.now();
const DAY = 86_400_000;

export const mockIpoCalendar: IpoCalendarResponse = {
  calendarKey: 'AUG_2026',
  calendarKeyNext: 'SEP_2026',
  calendarKeyPrev: 'JUL_2026',
  displayName: 'August 2026',
  calendarList: [
    {
      date: now - 5 * DAY,
      displayIpoList: [
        {
          id: '1',
          companyId: 1001,
          companyName: 'GreenTech Solutions Ltd',
          ipoType: 'mainboard',
          openDate: now - 5 * DAY,
          closeDate: now - 3 * DAY,
          listingDate: now + 2 * DAY,
          issueSize: 175.06,
          dayWiseSubscriptions: [{ total: 2.35 }],
          objectsOfIssue: [],
          seoName: 'greentech-solutions',
        },
      ],
      remainingCount: 0,
      openIpoList: [
        {
          id: '1',
          companyId: 1001,
          companyName: 'GreenTech Solutions Ltd',
          ipoType: 'mainboard',
          openDate: now - 5 * DAY,
          closeDate: now - 3 * DAY,
          listingDate: now + 2 * DAY,
          issueSize: 175.06,
          dayWiseSubscriptions: [{ total: 2.35 }],
          objectsOfIssue: [],
          seoName: 'greentech-solutions',
        },
      ],
      closeIpoList: [],
      listedIpoList: [],
    },
    {
      date: now + 2 * DAY,
      displayIpoList: [
        {
          id: '2',
          companyId: 1002,
          companyName: 'FinServ Capital Pvt Ltd',
          ipoType: 'sme',
          openDate: now + 3 * DAY,
          closeDate: now + 5 * DAY,
          listingDate: now + 10 * DAY,
          issueSize: 45.3,
          dayWiseSubscriptions: [],
          objectsOfIssue: [],
          seoName: 'finserv-capital',
        },
      ],
      remainingCount: 0,
      openIpoList: [],
      closeIpoList: [],
      listedIpoList: [],
    },
    {
      date: now + 10 * DAY,
      displayIpoList: [
        {
          id: '3',
          companyId: 1003,
          companyName: 'UrbanMovers Logistics Ltd',
          ipoType: 'mainboard',
          openDate: now - 10 * DAY,
          closeDate: now - 8 * DAY,
          listingDate: now + 10 * DAY,
          issueSize: 320.5,
          dayWiseSubscriptions: [{ total: 4.12 }],
          objectsOfIssue: [],
          seoName: 'urbanmovers-logistics',
        },
      ],
      remainingCount: 0,
      openIpoList: [],
      closeIpoList: [
        {
          id: '3',
          companyId: 1003,
          companyName: 'UrbanMovers Logistics Ltd',
          ipoType: 'mainboard',
          openDate: now - 10 * DAY,
          closeDate: now - 8 * DAY,
          listingDate: now + 10 * DAY,
          issueSize: 320.5,
          dayWiseSubscriptions: [{ total: 4.12 }],
          objectsOfIssue: [],
          seoName: 'urbanmovers-logistics',
        },
      ],
      listedIpoList: [],
    },
  ],
};

export const mockIpoDetails: IpoDetailsResponse = {
  success: true,
  message: 'success',
  ipoDetails: {
    companyid: '1001',
    companyname: 'GreenTech Solutions Ltd',
    companyseoname: 'greentech-solutions',
    issueSize: 175.06,
    priceRangeMin: 94,
    priceRangeMax: 99,
    lotSize: 151,
    minInvestment: 14_949,
    issuePrice: null,
    faceValue: '10',
    opendate: now - 5 * DAY,
    closedate: now - 3 * DAY,
    listingdate: now + 2 * DAY,
    exchangeNames: 'NSE & BSE',
    ipoType: 'mainboard',
    issueType: 'Book Building',
    ipoStatus: 'Open',
    retailSharesOfferedReservation: '88,41,500',
    totalSharesOffered: '1,76,83,000',
    saleType: 'Fresh Issue',
    issuePriceBand: '₹94 - ₹99',
    freshIssue: '175.06 Cr',
    offerForSale: null,
    allotmentPrice: null,
    objectsOfIssue: [
      {
        description: 'Funding capital expenditure for expansion',
        amount: 15.4,
        percentChange: 8.8,
      },
      {
        description: 'Funding working capital requirements',
        amount: 115.0,
        percentChange: 65.69,
      },
      {
        description: 'General corporate purposes',
        amount: 44.66,
        percentChange: 25.51,
      },
    ],
    leadManagers: [],
    managingDirector: null,
    promotersCompany: null,
    legalAdvisor: null,
  },
  timeline: [
    { date: now - 5 * DAY, status: true, message: 'Opening Date' },
    { date: now - 3 * DAY, status: true, message: 'Closing Date' },
    { date: now - 1 * DAY, status: false, message: 'Basis of Allotment' },
    { date: now + 1 * DAY, status: false, message: 'Initiation of Refunds' },
    { date: now + 2 * DAY, status: false, message: 'Credit of Shares' },
    { date: now + 2 * DAY, status: false, message: 'Listing Date' },
  ],
  subscription: {
    totalSubsTimes: 2.35,
    qualifiedInst: 1.17,
    reatilIndv: 0.58,
    nonInst: 0.6,
    marketMaker: null,
    employees: null,
    shareholders: null,
    policyholders: null,
    others: null,
    date: now,
    dayWiseSubs: [
      {
        day: 'Day 1',
        date: `${new Date(now - 5 * DAY).toLocaleDateString('en-IN')}`,
        dateLong: now - 5 * DAY,
        qibExAnchor: 1.17,
        nii: 0.6,
        retail: 0.58,
        total: 2.35,
      },
    ],
  },
  reservation: [
    { investorCatg: 'QIB', shares: '17,68,300', percentChange: 10.0 },
    { investorCatg: 'NII', shares: '70,73,200', percentChange: 40.0 },
    { investorCatg: 'Retail', shares: '88,41,500', percentChange: 50.0 },
  ],
  objectsOfIssue: [
    {
      description: 'Funding capital expenditure',
      amount: 15.4,
      percentChange: 8.8,
    },
    {
      description: 'Funding working capital',
      amount: 115.0,
      percentChange: 65.69,
    },
    {
      description: 'General corporate purposes',
      amount: 44.66,
      percentChange: 25.51,
    },
  ],
};

export const mockIpoLinks: IpoLinksResponse = {
  prospectusLink: null,
  rhpUrl: 'https://example.com/rhp.pdf',
  drhpLink: 'https://example.com/drhp.pdf',
  ipoType: 'mainboard',
  saleType: { label: 'Sale Type', value: 'Fresh Issue', rows: [] },
  issueType: { label: 'Issue Type', value: 'Book Building', rows: [] },
  footerNote: '',
};

export const mockPnl: PnlResponse = {
  datainfo: {
    profitandlossinfo: {
      profitandlossdetails: [
        {
          year: 2024,
          absolute: {
            sales: 520.3,
            totalincome: 530.1,
            operatingprofit: 120.5,
            profitbeforetax: 95.2,
            netprofit: 72.1,
            ebit: 110.3,
            ebitda: 130.4,
            eps: 14.5,
            depreciation: 18.2,
            interestname: 7.1,
            resultyear: 2024,
            resultmonth: 'Mar',
            months: 12,
          },
        },
        {
          year: 2025,
          absolute: {
            sales: 610.8,
            totalincome: 620.5,
            operatingprofit: 145.2,
            profitbeforetax: 118.6,
            netprofit: 89.4,
            ebit: 135.1,
            ebitda: 158.3,
            eps: 17.9,
            depreciation: 21.5,
            interestname: 8.6,
            resultyear: 2025,
            resultmonth: 'Mar',
            months: 12,
          },
        },
      ],
      companyfinancialratio: [],
    },
  },
};

export const mockQuarterly: QuarterlyResponse = {
  datainfo: {
    quarterlyresultsinfo: {
      companyQuarterlyResultslist: [
        {
          year: 2026,
          absolute: {
            sales: 165.2,
            totalincome: 168.0,
            operatingprofit: 40.1,
            profitbeforetax: 32.5,
            netprofit: 24.4,
            ebit: 37.2,
            ebitda: 44.8,
            eps: 4.9,
            resultyear: 2026,
            resultmonth: 'Jun',
            months: 3,
          },
        },
      ],
    },
  },
};

export const mockBs: BsResponse = {
  datainfo: {
    balancesheetinfo: {
      companyBalanceSheetList: [
        {
          year: 2025,
          grossblock: 210.5,
          netblock: 165.3,
          investments: 12.8,
          inventory: 45.2,
          sundrydebtor: 38.6,
          cashandbank: 22.1,
          totalassets: 380.5,
          sharecapital: 10.0,
          reservesandsurplus: 125.3,
          networth: 135.3,
          securedloans: 45.2,
          unsecuredloans: 18.6,
          totalliabilities: 63.8,
          currentassetsloansandadvances: 105.9,
          currentliabilitiesandprovisions: 42.1,
          months: 12,
        },
      ],
    },
  },
};

export const mockCf: CfResponse = {
  datainfo: {
    cashFlowList: {
      companyfinancialcashflowlist: [
        {
          resultyear: 2025,
          resultmonth: 'Mar',
          profitbeforetax: 118.6,
          netcashflowoperatingActivity: 95.3,
          netcashusedininvestingactivity: -62.1,
          netcashusedinfinanceactivity: -28.4,
          netincdecincashandequivlnt: 4.8,
          cashandequivalntbeginofyear: 17.3,
          cashandequivalntendofyear: 22.1,
          months: 12,
        },
      ],
    },
  },
};

export const mockListedIpos: ListedIposOverviewResponse = {
  results: [
    {
      companyID: 2001,
      companyName: 'Tata Technologies Ltd',
      companySeoName: 'tata-technologies-ltd',
      companyType: 'equity',
      companyShortName: 'Tata Technologies',
      listingDate: now - 30 * DAY,
      issuePrice: '₹500',
      listingPrice: '₹620',
      ltp: '₹715.50',
      returnFromIssue: '+43.1%',
      returnFromIssueTrend: 'up',
      issueSize: '₹3000 Cr',
      ipoType: 'Mainboard',
      listingGain: '+24%',
      listingGainTrend: 'up',
      rhpLink: 'https://example.com/tata-tech-rhp.pdf',
      lotSize: 26,
      totalSubscription: '73.4x',
    },
    {
      companyID: 2002,
      companyName: 'Ideaforge Technology Ltd',
      companySeoName: 'ideaforge-technology-ltd',
      companyType: 'equity',
      companyShortName: 'Ideaforge',
      listingDate: now - 60 * DAY,
      issuePrice: '₹672',
      listingPrice: '₹540',
      ltp: '₹489.20',
      returnFromIssue: '-27.2%',
      returnFromIssueTrend: 'down',
      issueSize: '₹520 Cr',
      ipoType: 'Mainboard',
      listingGain: '-19.6%',
      listingGainTrend: 'down',
      rhpLink: 'https://example.com/ideaforge-rhp.pdf',
      lotSize: 22,
      totalSubscription: '38.5x',
    },
  ],
  pageSummary: { pageno: 1, pagesize: 1000, totalrecords: 2, totalpages: 1 },
};

export const mockOpenIpoOverviewPage1: OpenIpoOverviewResponse = {
  openIpoList: [
    {
      companyName: 'GreenTech Solutions Ltd',
      companyKey: 'GREENTECH_SOLUTIONS_LTD_2026',
      ipoType: 'Mainboard',
      exchangeNames: 'NSE & BSE',
      openDate: now - 5 * DAY,
      closeDate: now + 2 * DAY,
      issueSize: '₹175.06 Cr',
      priceLabel: 'Price Band',
      priceRange: '₹94 – ₹99',
      lotSize: 'Lot - 151 shares',
      minInvestment: '₹14,949',
      subscription: '2.35x',
      rhpLink: 'https://example.com/greentech-rhp.pdf',
      openingToday: false,
      closingToday: false,
      saleType: 'Fresh Issue',
      companyID: 1001,
      companySeoName: 'greentech-solutions',
    },
  ],
  openIpoPageSummary: {
    pageno: 1,
    pagesize: 5,
    totalrecords: 6,
    totalpages: 2,
  },
};

export const mockOpenIpoOverviewPage2: OpenIpoOverviewResponse = {
  openIpoList: [
    {
      companyName: 'FinServ Capital Pvt Ltd',
      companyKey: 'FINSERV_CAPITAL_PVT_LTD_2026',
      ipoType: 'SME',
      exchangeNames: 'BSE',
      openDate: now - 3 * DAY,
      closeDate: now + 4 * DAY,
      issueSize: '₹45.30 Cr',
      priceLabel: 'Price Band',
      priceRange: '₹100 – ₹105',
      lotSize: 'Lot - 1200 shares',
      minInvestment: '₹1,26,000',
      subscription: '1.12x',
      rhpLink: 'https://example.com/finserv-rhp.pdf',
      openingToday: false,
      closingToday: false,
      saleType: 'Fresh Issue',
      companyID: 1002,
      companySeoName: 'finserv-capital',
    },
  ],
  openIpoPageSummary: {
    pageno: 2,
    pagesize: 5,
    totalrecords: 6,
    totalpages: 2,
  },
};

export const mockUpcomingIpoOverview: UpcomingIpoOverviewResponse = {
  upcomingIpoList: [
    {
      companyName: 'UrbanMovers Logistics Ltd',
      companyKey: 'URBANMOVERS_LOGISTICS_LTD_2026',
      ipoType: 'Mainboard',
      openDate: now + 3 * DAY,
      priceLabel: 'Price Band',
      issuePrice: '₹310 – ₹326',
      lotSize: 46,
      issueSize: '₹320.50 Cr',
      rhpLink: 'https://example.com/urbanmovers-rhp.pdf',
      companyID: 1003,
      companySeoName: 'urbanmovers-logistics',
      saleType: 'Offer For Sale',
      minInvestment: '₹14,996',
    },
  ],
  upcomingIpoPageSummary: {
    pageno: 1,
    pagesize: 1000,
    totalrecords: 1,
    totalpages: 1,
  },
};

export const mockListingSoonIpos: ListingSoonIpoResponse = {
  listingSoonIpoList: [
    {
      companyName: 'GreenTech Solutions Ltd',
      companyKey: 'GREENTECH_SOLUTIONS_LTD_2026',
      ipoType: 'Mainboard',
      priceLabel: 'Price Band',
      qibSubscription: '1.17x',
      niiSubscription: '0.60x',
      retailSubscription: '0.58x',
      totalSubscription: '2.35x',
      listingDate: now + 2 * DAY,
      rhpLink: 'https://example.com/greentech-rhp.pdf',
      prospectusLink: 'https://example.com/greentech-rhp.pdf',
      issueSize: '₹175.06 Cr',
      saleType: 'Fresh Issue',
      companyID: 1001,
      companySeoName: 'greentech-solutions',
      minInvestment: '₹14,949',
      openDate: now - 5 * DAY,
      lotSize: 151,
      priceRange: '₹94 – ₹99',
    },
  ],
  listingSoonIpoPageSummary: {
    pageno: 1,
    pagesize: 1000,
    totalrecords: 1,
    totalpages: 1,
  },
};
