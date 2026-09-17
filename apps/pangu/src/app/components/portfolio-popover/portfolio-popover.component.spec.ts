import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Popover } from 'flowbite';

import { Direction } from '../../models/market';
import { Holding } from '../../models/portfolio';
import { PortfolioPopoverComponent } from './portfolio-popover.component';

jest.mock('flowbite', () => ({
  Popover: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    toggle: jest.fn(),
    isVisible: jest.fn().mockReturnValue(false),
  })),
}));

describe('PortfolioPopoverComponent', () => {
  let component: PortfolioPopoverComponent;
  let fixture: ComponentFixture<PortfolioPopoverComponent>;

  const makeHolding = (overrides: Partial<Holding> = {}): Holding =>
    ({
      id: 'h1',
      name: 'Test Co',
      quantity: 10,
      averagePrice: 100,
      investment: 1000,
      marketValue: 1200,
      totalProfitLoss: {
        direction: Direction.UP,
        value: 200,
        percentage: 20,
      },
      scripCode: {},
      vendorCode: { etm: { primary: '1' } },
      transactions: [],
      ...overrides,
    }) as Holding;

  const setup = async (holding: Holding): Promise<void> => {
    jest.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [PortfolioPopoverComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioPopoverComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('holding', holding);
    fixture.detectChanges();
  };

  it('should create', async () => {
    await setup(makeHolding());
    expect(component).toBeTruthy();
  });

  it('should construct a Flowbite popover with auto placement', async () => {
    await setup(makeHolding());
    expect(Popover).toHaveBeenCalledTimes(1);
    expect(Popover).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.any(HTMLElement),
      expect.objectContaining({
        placement: 'auto',
        triggerType: 'hover',
      }),
    );
  });

  it('should destroy the popover on teardown', async () => {
    await setup(makeHolding());
    const instance = (Popover as jest.Mock).mock.results[0].value;
    fixture.destroy();
    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });

  it('should format all six stats in order', async () => {
    await setup(makeHolding());
    const stats = component['stats']();
    expect(stats.map((s) => s.label)).toEqual([
      'Avg Price',
      'Quantity',
      'Investment',
      'Current Value',
      'Total P/L',
      'Total P/L %',
    ]);
    expect(stats[0].value).toContain('100');
    expect(stats[1].value).toBe('10');
    const values = fixture.nativeElement.querySelectorAll<HTMLElement>(
      '[role="tooltip"] .font-medium',
    );
    expect(values[4].className).toContain('text-green-500');
  });

  it('should color losses red and placeholders for missing values', async () => {
    await setup(
      makeHolding({
        quantity: null,
        averagePrice: null,
        investment: null,
        marketValue: null,
        totalProfitLoss: {
          direction: Direction.DOWN,
          value: -50,
          percentage: null,
        } as never,
      }),
    );
    const stats = component['stats']();
    expect(stats[0].value).toBe('--');
    expect(stats[1].value).toBe('--');
    const values = fixture.nativeElement.querySelectorAll<HTMLElement>(
      '[role="tooltip"] .font-medium',
    );
    expect(values[4].className).toContain('text-red-600');
    expect(stats[5].value).toBe('--');
  });
});
