import { provideHttpClient } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LOGGER } from '@nidhi/shared-logger';
import { BehaviorSubject } from 'rxjs';

import { Portfolio } from '../../models/portfolio';
import { MarketService } from '../../services/core/market.service';
import { PortfolioService } from '../../services/portfolio.service';
import { StockSearchComponent } from './stock-search.component';

describe('StockSearchComponent', () => {
  let component: StockSearchComponent;
  let fixture: ComponentFixture<StockSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockSearchComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: LOGGER,
          useValue: {
            captureException: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            log: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default mode sitewide', () => {
    expect(component.mode()).toBe('sitewide');
  });

  it('should set query via model', () => {
    component.query.set('RELIANCE');
    fixture.detectChanges();
    expect(component.query()).toBe('RELIANCE');
  });

  it('should emit stockSelected on selectStock', () => {
    const stock = {
      vendorCode: { etm: { primary: 'RELIANCE' } },
      name: 'Reliance Industries Ltd',
    } as any;
    let emitted: any;
    component.stockSelected.subscribe((s) => (emitted = s));
    component.selectStock(stock);
    expect(emitted).toBe(stock);
  });

  it('should update query on input', () => {
    component.onInput('TCS');
    expect(component.query()).toBe('TCS');
  });

  it('should clear query and results on clear', () => {
    component.query.set('RELIANCE');
    fixture.detectChanges();
    component.showDropdown.set(true);

    component.clear();

    expect(component.query()).toBe('');
    expect(component.results().length).toBe(0);
    expect(component.showDropdown()).toBe(false);
  });

  it('should hide dropdown after blur delay', fakeAsync(() => {
    component.showDropdown.set(true);
    component.onBlur();
    expect(component.showDropdown()).toBe(true);
    tick(200);
    expect(component.showDropdown()).toBe(false);
  }));

  it('should focus the input when autoFocus is enabled', async () => {
    fixture.componentRef.setInput('autoFocus', true);
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    const focusSpy = jest.spyOn(input, 'focus');

    fixture.detectChanges();
    await Promise.resolve();

    expect(focusSpy).toHaveBeenCalled();
  });

  it('should not throw when autoFocus is enabled but no input is rendered', async () => {
    const searchInput = (component as any).searchInput;
    (component as any).searchInput = jest.fn().mockReturnValue(undefined);
    fixture.componentRef.setInput('autoFocus', true);

    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();

    await Promise.resolve();
    (component as any).searchInput = searchInput;
  });

  it('should clear results when query is shorter than the minimum length', () => {
    component.query.set('REL');
    fixture.detectChanges();

    expect(component.results().length).toBe(0);
    expect(component.showDropdown()).toBe(false);
  });

  it('should navigate on navigateToStock', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate');
    const stock = {
      vendorCode: { etm: { primary: 'RELIANCE' } },
      name: 'Reliance Industries Ltd',
    } as any;
    let emitted: any;
    component.stockSelected.subscribe((s) => (emitted = s));

    component.navigateToStock(stock);

    expect(component.query()).toBe('');
    expect(component.results().length).toBe(0);
    expect(component.showDropdown()).toBe(false);
    expect(emitted).toBe(stock);
    expect(navigateSpy).toHaveBeenCalledWith(['/stocks', 'RELIANCE']);
  });

  describe('sell mode', () => {
    let portfolioSubject: BehaviorSubject<Portfolio>;

    beforeEach(async () => {
      TestBed.resetTestingModule();

      portfolioSubject = new BehaviorSubject<Portfolio>({
        holdings: [
          {
            name: 'RELIANCE',
            vendorCode: { etm: { primary: 'comp-123' } },
            quantity: 10,
            scripCode: {},
          } as any,
          {
            name: 'TCS',
            vendorCode: { etm: { primary: 'comp-456' } },
            quantity: 5,
            scripCode: {},
          } as any,
        ],
        investment: 1000,
        marketValue: 1200,
        dayProfitLoss: { value: 50, direction: 0 } as any,
        totalProfitLoss: { value: 200, direction: 0 } as any,
        dayAdvance: { count: 1, value: 50 } as any,
        dayDecline: { count: 0, value: 0 } as any,
        totalAdvance: { count: 1, value: 200 } as any,
        totalDecline: { count: 0, value: 0 } as any,
      });

      await TestBed.configureTestingModule({
        imports: [StockSearchComponent],
        providers: [
          provideHttpClient(),
          provideRouter([]),
          {
            provide: LOGGER,
            useValue: {
              captureException: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              info: jest.fn(),
              log: jest.fn(),
              debug: jest.fn(),
            },
          },
          {
            provide: PortfolioService,
            useValue: { portfolio$: portfolioSubject.asObservable() },
          },
          {
            provide: MarketService,
            useValue: { search: () => new BehaviorSubject([]).asObservable() },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(StockSearchComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('mode', 'sell');
      fixture.detectChanges();
    });

    it('should have sell mode', () => {
      expect(component.mode()).toBe('sell');
    });

    it('should filter portfolio holdings on input', (done) => {
      component.onInput('RELIANCE');
      fixture.detectChanges();
      setTimeout(() => {
        expect(component.mode()).toBe('sell');
        expect(component.results().length).toBe(1);
        expect(component.results()[0].name).toBe('RELIANCE');
        expect(component.showDropdown()).toBe(true);
        done();
      }, 500);
    }, 10000);

    it('should show no results when no holdings match', (done) => {
      component.onInput('INFY');
      setTimeout(() => {
        fixture.detectChanges();
        expect(component.results().length).toBe(0);
        expect(component.showDropdown()).toBe(false);
        done();
      }, 500);
    }, 10000);
  });
});
