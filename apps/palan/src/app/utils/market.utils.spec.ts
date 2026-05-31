import { Direction } from '../models/market';
import { MarketUtils } from './market.utils';

describe('MarketUtils', () => {
  describe('GLOBAL_SYMBOL_REGEXP', () => {
    it('should match valid global symbols', () => {
      expect(MarketUtils.GLOBAL_SYMBOL_REGEXP.test('SYMBOL:COUNTRY')).toBe(true);
      expect(MarketUtils.GLOBAL_SYMBOL_REGEXP.test('ABC:IN')).toBe(true);
      expect(MarketUtils.GLOBAL_SYMBOL_REGEXP.test('FOO:BAR')).toBe(true);
    });

    it('should reject invalid global symbols', () => {
      expect(MarketUtils.GLOBAL_SYMBOL_REGEXP.test('TICKERONLY')).toBe(false);
      expect(MarketUtils.GLOBAL_SYMBOL_REGEXP.test('')).toBe(false);
      expect(MarketUtils.GLOBAL_SYMBOL_REGEXP.test('A:B:C')).toBe(false);
      expect(MarketUtils.GLOBAL_SYMBOL_REGEXP.test(':COUNTRY')).toBe(false);
      expect(MarketUtils.GLOBAL_SYMBOL_REGEXP.test('SYMBOL:')).toBe(false);
    });
  });

  describe('getDirection', () => {
    it('should return Direction.UP for positive values', () => {
      expect(MarketUtils.getDirection(5)).toBe(Direction.UP);
    });

    it('should return Direction.UP for zero', () => {
      expect(MarketUtils.getDirection(0)).toBe(Direction.UP);
    });

    it('should return Direction.DOWN for negative values', () => {
      expect(MarketUtils.getDirection(-1)).toBe(Direction.DOWN);
      expect(MarketUtils.getDirection(-100)).toBe(Direction.DOWN);
    });
  });

  describe('stringToNumber', () => {
    it('should remove commas and parse the number', () => {
      expect(MarketUtils.stringToNumber('1,234,567')).toBe(1234567);
    });

    it('should handle numbers without commas', () => {
      expect(MarketUtils.stringToNumber('12345')).toBe(12345);
    });

    it('should parse decimal numbers with commas', () => {
      expect(MarketUtils.stringToNumber('1,234.56')).toBe(1234.56);
    });

    it('should handle empty string', () => {
      expect(MarketUtils.stringToNumber('')).toBe(0);
    });
  });

  describe('dateStringToEpoch', () => {
    it('should convert a date string to epoch milliseconds', () => {
      const epoch = MarketUtils.dateStringToEpoch('2024-01-15');
      expect(epoch).toBe(new Date('2024-01-15').getTime());
    });
  });

  describe('getBusinessDays', () => {
    it('should return 0 for same day on a weekend', () => {
      const sat = new Date('2024-01-06T00:00:00').getTime();
      expect(MarketUtils.getBusinessDays(sat, sat)).toBe(0);
    });

    it('should return 1 for same business day', () => {
      const mon = new Date('2024-01-08T00:00:00').getTime();
      expect(MarketUtils.getBusinessDays(mon, mon)).toBe(1);
    });

    it('should count weekdays between two dates excluding weekends', () => {
      const mon = new Date('2024-01-08T00:00:00').getTime();
      const fri = new Date('2024-01-12T00:00:00').getTime();
      expect(MarketUtils.getBusinessDays(mon, fri)).toBe(5);
    });

    it('should skip weekends when counting', () => {
      const thu = new Date('2024-01-11T00:00:00').getTime();
      const mon = new Date('2024-01-15T00:00:00').getTime();
      expect(MarketUtils.getBusinessDays(thu, mon)).toBe(3);
    });
  });

  describe('isBusinessDay', () => {
    it('should return true for Monday through Friday', () => {
      expect(MarketUtils.isBusinessDay(new Date('2024-01-08'))).toBe(true);
      expect(MarketUtils.isBusinessDay(new Date('2024-01-09'))).toBe(true);
      expect(MarketUtils.isBusinessDay(new Date('2024-01-10'))).toBe(true);
      expect(MarketUtils.isBusinessDay(new Date('2024-01-11'))).toBe(true);
      expect(MarketUtils.isBusinessDay(new Date('2024-01-12'))).toBe(true);
    });

    it('should return false for Saturday', () => {
      expect(MarketUtils.isBusinessDay(new Date('2024-01-06'))).toBe(false);
    });

    it('should return false for Sunday', () => {
      expect(MarketUtils.isBusinessDay(new Date('2024-01-07'))).toBe(false);
    });
  });

  describe('getLastBusinessDay', () => {
    it('should return the same day if already a business day', () => {
      const wed = new Date('2024-01-10');
      const result = MarketUtils.getLastBusinessDay(wed);
      expect(result.getTime()).toBe(wed.getTime());
      expect(result).not.toBe(wed);
    });

    it('should return previous Friday when given Saturday', () => {
      const sat = new Date('2024-01-06');
      const result = MarketUtils.getLastBusinessDay(sat);
      expect(result.getTime()).toBe(new Date('2024-01-05').getTime());
    });

    it('should return previous Friday when given Sunday', () => {
      const sun = new Date('2024-01-07');
      const result = MarketUtils.getLastBusinessDay(sun);
      expect(result.getTime()).toBe(new Date('2024-01-05').getTime());
    });
  });

  describe('extractScripCodesFromMcSearchResult', () => {
    it('should parse global symbol format (ISIN, SYMBOL:COUNTRY)', () => {
      const html = '<span>US1234567890, AAPL:US</span>';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toEqual({
        isin: 'US1234567890',
        ticker: 'AAPL',
        country: 'US',
      });
    });

    it('should parse non-global symbol format (ISIN, TICKER) with empty ticker/country', () => {
      const html = '<span>IN1234567890, RELIANCE</span>';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toEqual({
        isin: 'IN1234567890',
        ticker: '',
        country: '',
      });
    });

    it('should return null when no span element is found', () => {
      const html = '<div>no span here</div>';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toBeNull();
    });

    it('should return null for empty result string', () => {
      const result = MarketUtils.extractScripCodesFromMcSearchResult('');
      expect(result).toBeNull();
    });

    it('should call logger.captureException when DOMParser throws', () => {
      const originalDOMParser = global.DOMParser;
      const mockError = new Error('DOMParser failed');
      global.DOMParser = jest.fn(() => ({
        parseFromString: jest.fn(() => {
          throw mockError;
        }),
      })) as any;

      const logger = { captureException: jest.fn() };
      const result = MarketUtils.extractScripCodesFromMcSearchResult(
        '<span>test</span>',
        logger,
      );

      expect(logger.captureException).toHaveBeenCalledWith(mockError);
      expect(result).toBeNull();

      global.DOMParser = originalDOMParser;
    });

    it('should handle DOMParser error gracefully when no logger is provided', () => {
      const originalDOMParser = global.DOMParser;
      global.DOMParser = jest.fn(() => ({
        parseFromString: jest.fn(() => {
          throw new Error('DOMParser failed');
        }),
      })) as any;

      const result = MarketUtils.extractScripCodesFromMcSearchResult(
        '<span>test</span>',
      );

      expect(result).toBeNull();

      global.DOMParser = originalDOMParser;
    });
  });
});
