import { Period } from '../models/chart';
import { ExchangeName } from '../models/market';
import {
  ExchangeCodeToNameMap,
  ExchangeNameToCodeMap,
  PeriodFrequencyQueryParamMap,
  PeriodMap,
  PeriodQueryParam,
  VendorCode,
} from './market.adapter';

describe('PeriodMap', () => {
  it('should map ONE_DAY to null', () => {
    expect(PeriodMap[Period.ONE_DAY]).toBeNull();
  });

  it('should map ONE_WEEK to 1w', () => {
    expect(PeriodMap[Period.ONE_WEEK]).toBe('1w');
  });

  it('should map ONE_MONTH to 1m', () => {
    expect(PeriodMap[Period.ONE_MONTH]).toBe('1m');
  });

  it('should map THREE_MONTHS to 3m', () => {
    expect(PeriodMap[Period.THREE_MONTHS]).toBe('3m');
  });

  it('should map SIX_MONTHS to 6m', () => {
    expect(PeriodMap[Period.SIX_MONTHS]).toBe('6m');
  });

  it('should map ONE_YEAR to 1y', () => {
    expect(PeriodMap[Period.ONE_YEAR]).toBe('1y');
  });

  it('should map FIVE_YEAR to 5y', () => {
    expect(PeriodMap[Period.FIVE_YEAR]).toBe('5y');
  });
});

describe('ExchangeNameToCodeMap', () => {
  it('should map NSE to 50', () => {
    expect(ExchangeNameToCodeMap[ExchangeName.NSE]).toBe('50');
  });

  it('should map BSE to 47', () => {
    expect(ExchangeNameToCodeMap[ExchangeName.BSE]).toBe('47');
  });
});

describe('ExchangeCodeToNameMap', () => {
  it('should map 50 to NSE', () => {
    expect(ExchangeCodeToNameMap['50']).toBe(ExchangeName.NSE);
  });

  it('should map 47 to BSE', () => {
    expect(ExchangeCodeToNameMap['47']).toBe(ExchangeName.BSE);
  });
});

describe('PeriodFrequencyQueryParamMap', () => {
  it('should map ONE_WEEK to day', () => {
    expect(PeriodFrequencyQueryParamMap[PeriodQueryParam.ONE_WEEK]).toBe('day');
  });

  it('should map ONE_MONTH to day', () => {
    expect(PeriodFrequencyQueryParamMap[PeriodQueryParam.ONE_MONTH]).toBe(
      'day',
    );
  });

  it('should map THREE_MONTH to week', () => {
    expect(PeriodFrequencyQueryParamMap[PeriodQueryParam.THREE_MONTH]).toBe(
      'week',
    );
  });

  it('should map SIX_MONTH to week', () => {
    expect(PeriodFrequencyQueryParamMap[PeriodQueryParam.SIX_MONTH]).toBe(
      'week',
    );
  });

  it('should map ONE_YEAR to week', () => {
    expect(PeriodFrequencyQueryParamMap[PeriodQueryParam.ONE_YEAR]).toBe(
      'week',
    );
  });

  it('should map FIVE_YEAR to month', () => {
    expect(PeriodFrequencyQueryParamMap[PeriodQueryParam.FIVE_YEAR]).toBe(
      'month',
    );
  });
});

describe('VendorCode interface', () => {
  it('should allow constructing a VendorCode with etm and mc', () => {
    const vc: VendorCode = {
      etm: { primary: 'p1', chart: 'c1' },
      mc: { primary: 'mp1' },
    };
    expect(vc.etm.primary).toBe('p1');
    expect(vc.mc?.primary).toBe('mp1');
  });

  it('should allow VendorCode with only etm', () => {
    const vc: VendorCode = {
      etm: { primary: 'p1' },
    };
    expect(vc.etm.primary).toBe('p1');
    expect(vc.mc).toBeUndefined();
  });
});
