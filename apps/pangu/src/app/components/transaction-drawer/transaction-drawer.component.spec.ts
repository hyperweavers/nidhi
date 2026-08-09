import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { LOGGER } from '@nidhi/shared-logger';
import { BehaviorSubject, of } from 'rxjs';

import { Direction } from '../../models/market';
import {
  Holding,
  Portfolio,
  TransactionEditContext,
  TransactionType,
} from '../../models/portfolio';
import { MarketService } from '../../services/core/market.service';
import { StorageService } from '../../services/core/storage.service';
import { PortfolioService } from '../../services/portfolio.service';
import { TransactionDrawerComponent } from './transaction-drawer.component';

jest.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));
jest.mock('flowbite', () => ({ initFlowbite: jest.fn() }));

const mockHolding: Holding = {
  id: 'h1',
  name: 'Reliance Industries',
  scripCode: { isin: 'INE002A01018', nse: 'RELIANCE', bse: '500325' },
  vendorCode: {
    etm: { primary: 'RELIANCE', chart: 'RELIANCE' },
    mc: { primary: 'mc-rel' },
  },
  quote: {
    nse: {
      price: 2500,
      change: { direction: Direction.UP, percentage: 1.5, value: 37.5 },
      close: 2462.5,
    },
  },
  transactions: [
    {
      id: 't1',
      type: TransactionType.BUY,
      date: 1700000000000,
      price: 2000,
      quantity: 10,
      charges: 50,
    },
  ],
  quantity: 10,
  averagePrice: 2005,
  investment: 20050,
  marketValue: 25000,
  totalProfitLoss: { direction: Direction.UP, percentage: 24.69, value: 4950 },
};

const mockPortfolio: Portfolio = {
  holdings: [mockHolding],
  investment: 20050,
  marketValue: 25000,
  dayProfitLoss: { direction: Direction.UP, percentage: 1.5, value: 375 },
  totalProfitLoss: { direction: Direction.UP, percentage: 24.69, value: 4950 },
  dayAdvance: { percentage: 100, value: 1 },
  dayDecline: { percentage: 0, value: 0 },
  totalAdvance: { percentage: 100, value: 1 },
  totalDecline: { percentage: 0, value: 0 },
};

describe('TransactionDrawerComponent', () => {
  let component: TransactionDrawerComponent;
  let fixture: ComponentFixture<TransactionDrawerComponent>;
  let portfolioSubject: BehaviorSubject<Portfolio>;
  let mockMarketService: jest.Mocked<Partial<MarketService>>;
  let mockStorageService: jest.Mocked<Partial<StorageService>>;

  const portfolioServiceStub = () => ({ portfolio$: portfolioSubject });
  const marketServiceStub = () => mockMarketService;
  const storageServiceStub = () => mockStorageService;
  const loggerStub = () => ({
    captureException: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(TransactionDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    portfolioSubject = new BehaviorSubject<Portfolio>(mockPortfolio);

    mockMarketService = {
      search: jest.fn().mockReturnValue(of([])),
      getStock: jest.fn().mockReturnValue(of(null)),
      searchSecondary: jest.fn().mockReturnValue(of([])),
    } as unknown as jest.Mocked<Partial<MarketService>>;

    mockStorageService = {
      addOrUpdate: jest.fn().mockResolvedValue(undefined),
      updateTransaction: jest.fn().mockResolvedValue(undefined),
      deleteTransaction: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Partial<StorageService>>;

    (globalThis as any).Datepicker = jest.fn().mockImplementation(() => ({
      getDate: jest.fn().mockReturnValue(''),
      hide: jest.fn(),
      setDate: jest.fn(),
    }));

    (window as any).FlowbiteInstances = {
      getInstance: jest.fn().mockReturnValue({ hide: jest.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [TransactionDrawerComponent],
      providers: [
        provideRouter([]),
        { provide: LOGGER, useFactory: loggerStub },
        { provide: PortfolioService, useFactory: portfolioServiceStub },
        { provide: MarketService, useFactory: marketServiceStub },
        { provide: StorageService, useFactory: storageServiceStub },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: jest.fn().mockReturnValue(null) },
            },
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('creation', () => {
    it('should create in add mode', () => {
      createComponent();
      expect(component).toBeTruthy();
      expect(component.mode()).toBe('add');
    });

    it('should create in edit mode', () => {
      fixture = TestBed.createComponent(TransactionDrawerComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('mode', 'edit');
      fixture.componentRef.setInput('editContext', {
        transaction: mockHolding.transactions[0],
        holdingId: 'h1',
        holdingName: 'Reliance Industries',
      } as TransactionEditContext);
      fixture.detectChanges();
      expect(component).toBeTruthy();
      expect(component.mode()).toBe('edit');
      expect(component.editContext()).toBeTruthy();
      expect(component.editContext()?.holdingName).toBe('Reliance Industries');
    });

    it('should update date on changeDate event', () => {
      createComponent();
      const inputEl = fixture.nativeElement.querySelector(
        '#dateInput',
      ) as HTMLInputElement;
      if (inputEl) {
        inputEl.value = '15/06/2024';
        inputEl.dispatchEvent(new Event('changeDate'));
        expect(component.date()).toBe('15/06/2024');
      }
    });
  });

  describe('save', () => {
    it('should call addTransaction on save in add mode', fakeAsync(() => {
      createComponent();
      fixture.componentRef.setInput('transactionType', TransactionType.BUY);
      fixture.detectChanges();
      component.selectedStock.set(mockHolding);
      component.name.set('Reliance Industries');
      component.date.set('01/01/2020');
      component.price.set(100);
      component.quantity.set(10);
      component.charges.set(50);

      component.save();
      tick();

      expect(mockStorageService.addOrUpdate).toHaveBeenCalledTimes(1);
      expect(mockStorageService.addOrUpdate).toHaveBeenCalledWith(
        mockHolding,
        expect.objectContaining({
          id: 'mocked-uuid',
          type: TransactionType.BUY,
          price: 100,
          quantity: 10,
          charges: 50,
        }),
      );
      expect(component.showStatusModal).toBe(true);
      expect(component.showTransactionProgress).toBe(false);
    }));

    it('should call updateTransaction on save in edit mode', fakeAsync(() => {
      fixture = TestBed.createComponent(TransactionDrawerComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('mode', 'edit');
      fixture.componentRef.setInput('editContext', {
        transaction: mockHolding.transactions[0],
        holdingId: 'h1',
        holdingName: 'Reliance Industries',
      } as TransactionEditContext);
      fixture.detectChanges();

      component.date.set('01/01/2020');
      component.price.set(150);
      component.quantity.set(5);
      component.charges.set(25);

      component.save();
      tick();

      expect(mockStorageService.updateTransaction).toHaveBeenCalledTimes(1);
      expect(mockStorageService.updateTransaction).toHaveBeenCalledWith(
        'h1',
        't1',
        expect.objectContaining({
          price: 150,
          quantity: 5,
          charges: 25,
        }),
      );
      expect(component.showStatusModal).toBe(true);
    }));

    it('should reject transaction with missing fields', fakeAsync(() => {
      createComponent();
      component.save();
      tick();
      expect(component.transactionFormError).toBe(
        'One or more field(s) containing invalid value(s)!',
      );
    }));

    it('should reject transaction with future date', fakeAsync(() => {
      createComponent();
      fixture.componentRef.setInput('transactionType', TransactionType.BUY);
      fixture.detectChanges();
      component.selectedStock.set(mockHolding);
      component.name.set('Test');
      const futureYear = new Date().getFullYear() + 5;
      component.date.set(`01/01/${futureYear}`);
      component.price.set(100);
      component.quantity.set(10);
      component.charges.set(50);

      component.save();
      tick();

      expect(component.transactionFormError).toBe('Date is in future!');
    }));

    it('should submit transaction successfully', fakeAsync(() => {
      createComponent();
      fixture.componentRef.setInput('transactionType', TransactionType.BUY);
      fixture.detectChanges();
      component.selectedStock.set(mockHolding);
      component.name.set('Reliance Industries');
      component.date.set('01/01/2020');
      component.price.set(100);
      component.quantity.set(10);
      component.charges.set(50);

      component.save();
      tick();

      expect(mockStorageService.addOrUpdate).toHaveBeenCalledTimes(1);
      expect(component.showStatusModal).toBe(true);
      expect(component.showTransactionProgress).toBe(false);
    }));
  });

  describe('selectStock', () => {
    it('should select a stock that has ISIN', () => {
      createComponent();
      component.selectStock(mockHolding);
      expect(component.selectedStock()).toEqual(mockHolding);
      expect(component.name()).toBe('Reliance Industries');
      expect(component.showSearchResults).toBe(false);
    });

    it('should enrich stock when ISIN is missing and getStock returns null', fakeAsync(() => {
      const stockWithoutIsin: Holding = {
        ...mockHolding,
        scripCode: { ...mockHolding.scripCode, isin: '' },
      };
      mockMarketService.getStock.mockReturnValue(of(null));

      createComponent();
      component.selectStock(stockWithoutIsin);
      tick();

      expect(mockMarketService.getStock).toHaveBeenCalledWith('RELIANCE', true);
      expect(component.selectedStock()).toBeUndefined();
      expect(component.transactionFormError).toBe(
        'Unable to get the details of the selected stock!',
      );
    }));

    it('should enrich stock when ISIN is missing and searchSecondary returns results with match', fakeAsync(() => {
      const stockWithoutIsin: Holding = {
        ...mockHolding,
        scripCode: { ...mockHolding.scripCode, isin: '' },
      };
      const stockDetails = {
        scripCode: { nse: 'RELIANCE', isin: 'INE002A01018' },
        vendorCode: { etm: { primary: 'RELIANCE' }, mc: { primary: '' } },
        details: { sector: { name: 'Financial' } },
        metrics: { nse: { pe: 25 } },
      };
      const secondaryResult = {
        scripCode: { nse: 'RELIANCE', isin: 'INE002A01018' },
        vendorCode: { mc: { primary: 'mc-rel' } },
      };
      mockMarketService.getStock.mockReturnValue(of(stockDetails));
      mockMarketService.searchSecondary.mockReturnValue(of([secondaryResult]));

      createComponent();
      component.selectStock(stockWithoutIsin);
      tick();

      expect(mockMarketService.searchSecondary).toHaveBeenCalledWith(
        'RELIANCE',
      );
      expect(mockMarketService.getStock).toHaveBeenCalledWith('RELIANCE', true);
      expect(component.selectedStock()).toBeDefined();
      expect(component.selectedStock()?.vendorCode.mc.primary).toBe('mc-rel');
      expect(component.name()).toBe('Reliance Industries');
    }));

    it('should enrich stock when ISIN is missing and searchSecondary returns no match', fakeAsync(() => {
      const stockWithoutIsin: Holding = {
        ...mockHolding,
        scripCode: { ...mockHolding.scripCode, isin: '' },
      };
      const stockDetails = {
        scripCode: { nse: 'RELIANCE', isin: 'INE002A01018' },
        vendorCode: { etm: { primary: 'RELIANCE' }, mc: { primary: '' } },
        details: { sector: { name: 'Financial' } },
        metrics: { nse: { pe: 25 } },
      };
      mockMarketService.getStock.mockReturnValue(of(stockDetails));
      mockMarketService.searchSecondary.mockReturnValue(of([]));

      createComponent();
      component.selectStock(stockWithoutIsin);
      tick();

      expect(component.selectedStock()).toBeDefined();
      expect(component.selectedStock()?.vendorCode.mc.primary).toBe('');
    }));

    it('should enrich stock when ISIN is missing and searchSecondary returns results without isin/nse/bse match', fakeAsync(() => {
      const stockWithoutIsin: Holding = {
        ...mockHolding,
        scripCode: { ...mockHolding.scripCode, isin: '' },
      };
      const stockDetails = {
        scripCode: { nse: 'RELIANCE', isin: 'INE002A01018' },
        vendorCode: { etm: { primary: 'RELIANCE' }, mc: { primary: '' } },
        details: { sector: { name: 'Financial' } },
        metrics: { nse: { pe: 25 } },
      };
      const secondaryResult = {
        scripCode: { nse: 'OTHER', isin: 'OTHERISIN' },
        vendorCode: { mc: { primary: 'mc-other' } },
      };
      mockMarketService.getStock.mockReturnValue(of(stockDetails));
      mockMarketService.searchSecondary.mockReturnValue(of([secondaryResult]));

      createComponent();
      component.selectStock(stockWithoutIsin);
      tick();

      expect(component.selectedStock()).toBeDefined();
      expect(component.selectedStock()?.vendorCode.mc.primary).toBe('');
    }));
  });

  describe('searchResults$', () => {
    it('should search portfolio when transaction type is SELL', fakeAsync(() => {
      createComponent();
      fixture.componentRef.setInput('transactionType', TransactionType.SELL);
      fixture.detectChanges();

      const results: Stock[][] = [];
      const sub = component.stockSearchResults$.subscribe((r) =>
        results.push(r),
      );

      component.name.set('Reliance');
      fixture.detectChanges();
      tick(600);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].length).toBe(1);
      expect(results[0][0].name).toBe('Reliance Industries');

      sub.unsubscribe();
    }));
  });

  describe('save error branches', () => {
    it('should show error when update has future date', fakeAsync(() => {
      fixture = TestBed.createComponent(TransactionDrawerComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('mode', 'edit');
      fixture.componentRef.setInput('editContext', {
        transaction: mockHolding.transactions[0],
        holdingId: 'h1',
        holdingName: 'Reliance Industries',
      } as TransactionEditContext);
      fixture.detectChanges();

      const futureYear = new Date().getFullYear() + 5;
      component.date.set(`01/01/${futureYear}`);
      component.price.set(100);
      component.quantity.set(10);
      component.charges.set(50);

      component.save();
      tick();

      expect(component.transactionFormError).toBe('Date is in future!');
    }));

    it('should show error when update has missing fields', fakeAsync(() => {
      fixture = TestBed.createComponent(TransactionDrawerComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('mode', 'edit');
      fixture.componentRef.setInput('editContext', {
        transaction: mockHolding.transactions[0],
        holdingId: 'h1',
        holdingName: 'Reliance Industries',
      } as TransactionEditContext);
      fixture.detectChanges();

      component.save();
      tick();

      expect(component.transactionFormError).toBe(
        'One or more field(s) containing invalid value(s)!',
      );
    }));
  });

  describe('resetForm', () => {
    it('should reset form', () => {
      createComponent();
      (component as any).datepicker = {
        getDate: jest.fn().mockReturnValue(''),
        hide: jest.fn(),
        setDate: jest.fn(),
      };
      component.selectedStock.set(mockHolding);
      component.name.set('Test');
      component.date.set('01/01/2020');
      component.price.set(100);
      component.quantity.set(10);
      component.charges.set(50);

      component.resetForm();

      expect(component.selectedStock()).toBeUndefined();
      expect(component.name()).toBe('');
      expect(component.price()).toBe(0);
      expect(component.quantity()).toBe(0);
      expect(component.charges()).toBe(0);
    });
  });

  describe('closeStatusModal', () => {
    it('should close status modal', () => {
      createComponent();
      component.showStatusModal = true;
      component.closeStatusModal();
      expect(component.showStatusModal).toBe(false);
    });
  });

  describe('computed signals', () => {
    it('should compute gross and net from signals', fakeAsync(() => {
      createComponent();
      component.price.set(200);
      component.quantity.set(5);
      component.charges.set(25);
      tick();
      expect(component.gross()).toBe(1000);
      expect(component.net()).toBe(1025);
    }));

    it('should deduct charges for sell transactions', fakeAsync(() => {
      createComponent();
      fixture.componentRef.setInput('transactionType', TransactionType.SELL);
      fixture.detectChanges();
      component.price.set(200);
      component.quantity.set(5);
      component.charges.set(25);
      tick();
      expect(component.gross()).toBe(1000);
      expect(component.net()).toBe(975);
    }));
  });
});
