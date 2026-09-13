import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import {
  mockListingSoonIpos,
  mockOpenIpoOverviewPage1,
  mockOpenIpoOverviewPage2,
  mockUpcomingIpoOverview,
} from '../mocks/ipo-data';
import { MarketService } from './core/market.service';
import { IpoService } from './ipo.service';

describe('IpoService', () => {
  let service: IpoService;
  let marketServiceMock: {
    getIpoCalendar: jest.Mock;
    getIpoDetails: jest.Mock;
    getIpoDetailsOnly: jest.Mock;
    getIpoOverviewOpen: jest.Mock;
    getIpoOverviewUpcoming: jest.Mock;
    getIpoOverviewListing: jest.Mock;
    getIpoListedOverview: jest.Mock;
    getIpoStockQuote: jest.Mock;
    getIpoFinancials: jest.Mock;
  };

  beforeEach(() => {
    marketServiceMock = {
      getIpoCalendar: jest.fn().mockReturnValue(of({ calendarList: [] })),
      getIpoDetails: jest.fn().mockReturnValue(of({ success: true })),
      getIpoDetailsOnly: jest.fn().mockReturnValue(of({ rhpUrl: '' })),
      getIpoOverviewOpen: jest
        .fn()
        .mockReturnValue(of(mockOpenIpoOverviewPage1)),
      getIpoOverviewUpcoming: jest
        .fn()
        .mockReturnValue(of(mockUpcomingIpoOverview)),
      getIpoOverviewListing: jest.fn().mockReturnValue(of(mockListingSoonIpos)),
      getIpoListedOverview: jest.fn().mockReturnValue(of({ results: [] })),
      getIpoStockQuote: jest.fn().mockReturnValue(of({})),
      getIpoFinancials: jest
        .fn()
        .mockReturnValue(of({ pnl: {}, quarterly: {}, bs: {}, cf: {} })),
    };

    TestBed.configureTestingModule({
      providers: [
        IpoService,
        { provide: MarketService, useValue: marketServiceMock },
      ],
    });

    service = TestBed.inject(IpoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCalendar', () => {
    it('should delegate to MarketService', () => {
      service.getCalendar('AUG_2026').subscribe();

      expect(marketServiceMock.getIpoCalendar).toHaveBeenCalledWith('AUG_2026');
    });
  });

  describe('getDetails', () => {
    it('should delegate to MarketService', () => {
      service.getDetails('1001').subscribe();

      expect(marketServiceMock.getIpoDetails).toHaveBeenCalledWith('1001');
    });
  });

  describe('getLinks', () => {
    it('should delegate to MarketService', () => {
      service.getLinks('1001').subscribe();

      expect(marketServiceMock.getIpoDetailsOnly).toHaveBeenCalledWith('1001');
    });
  });

  describe('getOpenOverviewAll', () => {
    it('should fetch all pages and concatenate items', (done) => {
      marketServiceMock.getIpoOverviewOpen
        .mockReturnValueOnce(of(mockOpenIpoOverviewPage1))
        .mockReturnValueOnce(of(mockOpenIpoOverviewPage2));

      service.getOpenOverviewAll().subscribe((items) => {
        expect(marketServiceMock.getIpoOverviewOpen).toHaveBeenCalledWith(1);
        expect(marketServiceMock.getIpoOverviewOpen).toHaveBeenCalledWith(2);
        expect(items.map((i) => i.companyID)).toEqual([1001, 1002]);
        done();
      });
    });

    it('should make a single call when there is only one page', (done) => {
      marketServiceMock.getIpoOverviewOpen.mockReturnValueOnce(
        of({
          ...mockOpenIpoOverviewPage1,
          openIpoPageSummary: {
            pageno: 1,
            pagesize: 5,
            totalrecords: 1,
            totalpages: 1,
          },
        }),
      );

      service.getOpenOverviewAll().subscribe((items) => {
        expect(marketServiceMock.getIpoOverviewOpen).toHaveBeenCalledTimes(1);
        expect(items).toHaveLength(1);
        done();
      });
    });

    it('should default missing lists and page info', (done) => {
      marketServiceMock.getIpoOverviewOpen.mockReturnValueOnce(of({}));
      service.getOpenOverviewAll().subscribe((items) => {
        expect(items).toEqual([]);
        done();
      });
    });

    it('should default a missing page list when concatenating', (done) => {
      marketServiceMock.getIpoOverviewOpen
        .mockReturnValueOnce(of(mockOpenIpoOverviewPage1))
        .mockReturnValueOnce(of({}));
      service.getOpenOverviewAll().subscribe((items) => {
        expect(items.map((i) => i.companyID)).toEqual([1001]);
        done();
      });
    });
  });

  describe('getUpcomingOverview', () => {
    it('should return upcoming items', (done) => {
      service.getUpcomingOverview().subscribe((items) => {
        expect(marketServiceMock.getIpoOverviewUpcoming).toHaveBeenCalled();
        expect(items).toHaveLength(1);
        expect(items[0].companyName).toBe('UrbanMovers Logistics Ltd');
        done();
      });
    });

    it('should default a missing upcoming list', (done) => {
      marketServiceMock.getIpoOverviewUpcoming.mockReturnValueOnce(of({}));
      service.getUpcomingOverview().subscribe((items) => {
        expect(items).toEqual([]);
        done();
      });
    });
  });

  describe('getListingSoon', () => {
    it('should return listing-soon items', (done) => {
      service.getListingSoon().subscribe((items) => {
        expect(marketServiceMock.getIpoOverviewListing).toHaveBeenCalled();
        expect(items).toHaveLength(1);
        expect(items[0].totalSubscription).toBe('2.35x');
        done();
      });
    });

    it('should default a missing listing-soon list', (done) => {
      marketServiceMock.getIpoOverviewListing.mockReturnValueOnce(of({}));
      service.getListingSoon().subscribe((items) => {
        expect(items).toEqual([]);
        done();
      });
    });
  });

  describe('getListedOverview', () => {
    it('should delegate to MarketService', () => {
      service.getListedOverview().subscribe();

      expect(marketServiceMock.getIpoListedOverview).toHaveBeenCalled();
    });

    it('should default a missing listed results list', (done) => {
      marketServiceMock.getIpoListedOverview.mockReturnValueOnce(of({}));
      service.getListedOverview().subscribe((items) => {
        expect(items).toEqual([]);
        done();
      });
    });
  });

  describe('getStockQuote', () => {
    it('should return null for empty companyId', (done) => {
      service.getStockQuote('').subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });

    it('should delegate to MarketService', () => {
      service.getStockQuote('1001').subscribe();

      expect(marketServiceMock.getIpoStockQuote).toHaveBeenCalledWith('1001');
    });
  });

  describe('getDetailsAndQuote', () => {
    it('should fetch details and quote in parallel', () => {
      service.getDetailsAndQuote('1001').subscribe((result) => {
        expect(result.details).toBeDefined();
        expect(result.quote).toBeDefined();
      });
    });

    it('should fall back to a null quote when the quote request fails', (done) => {
      marketServiceMock.getIpoStockQuote.mockReturnValueOnce(
        throwError(() => new Error('quote down')),
      );
      service.getDetailsAndQuote('1001').subscribe((result) => {
        expect(result.details).toBeDefined();
        expect(result.quote).toBeNull();
        done();
      });
    });
  });

  describe('getFinancials', () => {
    it('should delegate to MarketService', () => {
      service.getFinancials('1001', 'standalone').subscribe();

      expect(marketServiceMock.getIpoFinancials).toHaveBeenCalledWith(
        '1001',
        'standalone',
      );
    });

    it('should default to standalone financials', () => {
      service.getFinancials('1001').subscribe();

      expect(marketServiceMock.getIpoFinancials).toHaveBeenCalledWith(
        '1001',
        'standalone',
      );
    });
  });
});
