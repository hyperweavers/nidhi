import { TooltipItem } from 'chart.js';

import { ChartType } from '../models/chart';
import {
  formatAnnualSummaryFooter,
  formatBarLabel,
  formatBarTitle,
  formatClosingBalanceFooter,
  formatDoughnutLabel,
  formatEmiTitle,
  formatLineLabel,
  formatMaturityFooter,
  formatSchemeTitle,
} from './chart.helper';

const mockDecimalPipe = {
  transform: jest.fn().mockReturnValue('1,00,000'),
} as any;

const barContext = (
  overrides: Partial<TooltipItem<ChartType.BAR>> = {},
): TooltipItem<ChartType.BAR> =>
  ({
    dataset: { label: '' },
    parsed: { x: 0, y: 0 },
    dataIndex: 0,
    datasetIndex: 0,
    label: '',
    formattedValue: '',
    raw: null,
    ...overrides,
  }) as TooltipItem<ChartType.BAR>;

const lineContext = (
  overrides: Partial<TooltipItem<ChartType.LINE>> = {},
): TooltipItem<ChartType.LINE> =>
  ({
    dataset: { label: '' },
    parsed: { x: 0, y: 0 },
    dataIndex: 0,
    datasetIndex: 0,
    label: '',
    formattedValue: '',
    raw: null,
    ...overrides,
  }) as TooltipItem<ChartType.LINE>;

const barItems = (
  overrides: Partial<TooltipItem<ChartType.BAR>>[] = [],
): TooltipItem<ChartType.BAR>[] => overrides.map((o) => barContext(o));

describe('formatDoughnutLabel', () => {
  it('should format normal number', () => {
    expect(
      formatDoughnutLabel(
        { parsed: 50000 } as TooltipItem<ChartType.DOUGHNUT>,
        mockDecimalPipe,
      ),
    ).toBe('1,00,000');
  });

  it('should return empty string when transform returns null', () => {
    const nullPipe = { transform: () => null } as any;
    expect(
      formatDoughnutLabel(
        { parsed: 0 } as TooltipItem<ChartType.DOUGHNUT>,
        nullPipe,
      ),
    ).toBe('');
  });
});

describe('formatBarLabel', () => {
  it('should format with label and value', () => {
    expect(
      formatBarLabel(
        barContext({
          dataset: { label: 'Deposit' },
          parsed: { x: 0, y: 50000 },
        }),
        '1.0-0',
        mockDecimalPipe,
      ),
    ).toBe('Deposit: 1,00,000');
  });

  it('should return empty string when value is null', () => {
    expect(
      formatBarLabel(
        barContext({
          dataset: { label: 'Deposit' },
          parsed: { x: 0, y: null },
        }),
        '1.0-0',
        mockDecimalPipe,
      ),
    ).toBe('');
  });

  it('should return empty string when parsed is undefined', () => {
    expect(
      formatBarLabel(
        barContext({ parsed: undefined } as any),
        '1.0-0',
        mockDecimalPipe,
      ),
    ).toBe('');
  });

  it('should return empty string when label is empty', () => {
    expect(
      formatBarLabel(
        barContext({ dataset: { label: '' }, parsed: { x: 0, y: 50000 } }),
        '1.0-0',
        mockDecimalPipe,
      ),
    ).toBe('');
  });
});

describe('formatBarTitle', () => {
  it('should format with prefix and label', () => {
    expect(formatBarTitle(barItems([{ label: '2024' }]), 'Year')).toBe(
      'Year: 2024',
    );
  });

  it('should return empty string when array is empty', () => {
    expect(formatBarTitle([], 'Year')).toBe('');
  });

  it('should return empty string when first item has no label', () => {
    expect(formatBarTitle(barItems([{ label: '' }]), 'FY')).toBe('');
  });
});

describe('formatAnnualSummaryFooter', () => {
  it('should format total interest minus deposit', () => {
    expect(
      formatAnnualSummaryFooter(
        barItems([
          { parsed: { x: 0, y: 50000 } },
          { parsed: { x: 0, y: 30000 } },
        ]),
        10000,
        mockDecimalPipe,
      ),
    ).toBe('Total Interest: 1,00,000');
  });

  it('should return empty string when no items', () => {
    expect(formatAnnualSummaryFooter([], 100000, mockDecimalPipe)).toBe('');
  });
});

describe('formatLineLabel', () => {
  it('should format with label and value', () => {
    expect(
      formatLineLabel(
        lineContext({
          dataset: { label: 'Principal' },
          parsed: { x: 0, y: 20100 },
        }),
        mockDecimalPipe,
      ),
    ).toBe('Principal: 1,00,000');
  });

  it('should return empty string when value is null', () => {
    expect(
      formatLineLabel(
        lineContext({
          dataset: { label: 'Principal' },
          parsed: { x: 0, y: null },
        }),
        mockDecimalPipe,
      ),
    ).toBe('');
  });

  it('should format with suffix', () => {
    const pipe = { transform: jest.fn().mockReturnValue('7.50') } as any;
    expect(
      formatLineLabel(
        lineContext({ dataset: { label: 'Rate' }, parsed: { x: 0, y: 7.5 } }),
        pipe,
        '1.2-2',
        '%',
      ),
    ).toBe('Rate: 7.50%');
  });
});

describe('formatSchemeTitle', () => {
  it('should format with Scheme prefix', () => {
    expect(formatSchemeTitle(barItems([{ label: 'PPF' }]))).toBe('Scheme: PPF');
  });

  it('should return empty string when array is empty', () => {
    expect(formatSchemeTitle([])).toBe('');
  });

  it('should return empty string when first item has no label', () => {
    expect(formatSchemeTitle(barItems([{ label: '' }]))).toBe('');
  });
});

describe('formatMaturityFooter', () => {
  it('should format maturity from sum of items', () => {
    expect(
      formatMaturityFooter(
        barItems([
          { parsed: { x: 0, y: 100000 } },
          { parsed: { x: 0, y: 50000 } },
        ]),
        mockDecimalPipe,
      ),
    ).toBe('Maturity: 1,00,000');
  });

  it('should return empty string when no items', () => {
    expect(formatMaturityFooter([], mockDecimalPipe)).toBe('');
  });
});

describe('formatClosingBalanceFooter', () => {
  it('should format closing balance from sum of items', () => {
    expect(
      formatClosingBalanceFooter(
        barItems([
          { parsed: { x: 0, y: 100000 } },
          { parsed: { x: 0, y: 50000 } },
        ]),
        mockDecimalPipe,
      ),
    ).toBe('Closing Balance: 1,00,000');
  });

  it('should return empty string when no items', () => {
    expect(formatClosingBalanceFooter([], mockDecimalPipe)).toBe('');
  });
});

describe('formatEmiTitle', () => {
  it('should format with EMI prefix', () => {
    expect(
      formatEmiTitle([{ label: '12' }] as TooltipItem<ChartType.LINE>[]),
    ).toBe('EMI: 12');
  });

  it('should return empty string when no items', () => {
    expect(formatEmiTitle([])).toBe('');
  });

  it('should return empty string when first item has no label', () => {
    expect(
      formatEmiTitle([{ label: '' }] as TooltipItem<ChartType.LINE>[]),
    ).toBe('');
  });
});
