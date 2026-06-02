import { Direction } from '../models/market';
import { MarketUtils } from './market.utils';

describe('MarketUtils', () => {
  describe('getDirection', () => {
    it('should return UP for positive values', () => {
      expect(MarketUtils.getDirection(5)).toBe(Direction.UP);
    });

    it('should return UP for zero', () => {
      expect(MarketUtils.getDirection(0)).toBe(Direction.UP);
    });

    it('should return DOWN for negative values', () => {
      expect(MarketUtils.getDirection(-1)).toBe(Direction.DOWN);
    });

    it('should return DOWN for negative decimal values', () => {
      expect(MarketUtils.getDirection(-0.5)).toBe(Direction.DOWN);
    });
  });

  describe('stringToNumber', () => {
    it('should parse a plain number string', () => {
      expect(MarketUtils.stringToNumber('1234')).toBe(1234);
    });

    it('should remove commas and parse', () => {
      expect(MarketUtils.stringToNumber('1,234.56')).toBe(1234.56);
    });

    it('should return 0 for empty string', () => {
      expect(MarketUtils.stringToNumber('')).toBe(0);
    });

    it('should return NaN for non-numeric string', () => {
      expect(MarketUtils.stringToNumber('abc')).toBeNaN();
    });
  });

  describe('dateStringToEpoch', () => {
    it('should return a number for a valid date string', () => {
      const result = MarketUtils.dateStringToEpoch('2024-01-15');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('should return NaN for an invalid date string', () => {
      expect(MarketUtils.dateStringToEpoch('not-a-date')).toBeNaN();
    });
  });

  describe('getBusinessDays', () => {
    it('should return 1 for the same weekday', () => {
      const mon = new Date(2024, 0, 1).getTime();
      expect(MarketUtils.getBusinessDays(mon, mon)).toBe(1);
    });

    it('should return 0 for the same weekend day', () => {
      const sat = new Date(2024, 0, 6).getTime();
      expect(MarketUtils.getBusinessDays(sat, sat)).toBe(0);
    });

    it('should count weekdays between Monday and Wednesday', () => {
      const mon = new Date(2024, 0, 1).getTime();
      const wed = new Date(2024, 0, 3).getTime();
      expect(MarketUtils.getBusinessDays(mon, wed)).toBe(3);
    });

    it('should exclude weekends', () => {
      const fri = new Date(2024, 0, 5).getTime();
      const mon = new Date(2024, 0, 8).getTime();
      expect(MarketUtils.getBusinessDays(fri, mon)).toBe(2);
    });

    it('should return 0 when start is after end', () => {
      const mon = new Date(2024, 0, 1).getTime();
      const later = new Date(2025, 0, 1).getTime();
      expect(MarketUtils.getBusinessDays(later, mon)).toBe(0);
    });

    it('should count only weekdays over a full week', () => {
      const mon = new Date(2024, 0, 1).getTime();
      const sun = new Date(2024, 0, 7).getTime();
      expect(MarketUtils.getBusinessDays(mon, sun)).toBe(5);
    });
  });

  describe('isBusinessDay', () => {
    it('should return true for Monday', () => {
      expect(MarketUtils.isBusinessDay(new Date(2024, 0, 1))).toBe(true);
    });

    it('should return false for Saturday', () => {
      expect(MarketUtils.isBusinessDay(new Date(2024, 0, 6))).toBe(false);
    });

    it('should return false for Sunday', () => {
      expect(MarketUtils.isBusinessDay(new Date(2024, 0, 7))).toBe(false);
    });
  });

  describe('getLastBusinessDay', () => {
    it('should return the same date if it is already a business day', () => {
      const monday = new Date(2024, 0, 1);
      const result = MarketUtils.getLastBusinessDay(monday);
      expect(result).toBe(monday);
      expect(result.getDay()).toBe(1);
    });

    it('should return Friday for a Saturday', () => {
      const saturday = new Date(2024, 0, 6);
      const result = MarketUtils.getLastBusinessDay(saturday);
      expect(result.getDay()).toBe(5);
    });

    it('should return Friday for a Sunday', () => {
      const sunday = new Date(2024, 0, 7);
      const result = MarketUtils.getLastBusinessDay(sunday);
      expect(result.getDay()).toBe(5);
    });

    it('should mutate the original date', () => {
      const saturday = new Date(2024, 0, 6);
      const result = MarketUtils.getLastBusinessDay(saturday);
      expect(result).toBe(saturday);
    });
  });

  describe('extractScripCodesFromMcSearchResult', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return scrip codes when span contains non-numeric second char (NSE-listed)', () => {
      const html = '<span>INFY</span>';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toEqual({ isin: 'I', nse: 'N', bse: 'F' });
    });

    it('should return scrip codes when span contains numeric second char (BSE-listed)', () => {
      const html = '<span>I1234</span>';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toEqual({ isin: 'I', nse: '', bse: '1' });
    });

    it('should return null when no span is found', () => {
      const html = '<div>No span here</div>';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toBeNull();
    });

    it('should return null when span is empty', () => {
      const html = '<span></span>';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toBeNull();
    });

    it('should call logger.captureException when DOMParser throws', () => {
      const mockLogger = { captureException: jest.fn() };
      jest
        .spyOn(DOMParser.prototype, 'parseFromString')
        .mockImplementation(() => {
          throw new Error('Parse failure');
        });

      const result = MarketUtils.extractScripCodesFromMcSearchResult(
        '<span>test</span>',
        mockLogger,
      );

      expect(result).toBeNull();
      expect(mockLogger.captureException).toHaveBeenCalledTimes(1);
      expect(mockLogger.captureException).toHaveBeenCalledWith(
        expect.any(Error),
      );
    });

    it('should not throw when DOMParser throws and no logger is provided', () => {
      jest
        .spyOn(DOMParser.prototype, 'parseFromString')
        .mockImplementation(() => {
          throw new Error('Parse failure');
        });

      expect(() =>
        MarketUtils.extractScripCodesFromMcSearchResult('<span>test</span>'),
      ).not.toThrow();
    });
  });

  describe('static properties', () => {
    it('should have POSITIVE_WHOLE_NUMBER_REGEXP defined', () => {
      expect(MarketUtils.POSITIVE_WHOLE_NUMBER_REGEXP).toBeDefined();
      expect(MarketUtils.POSITIVE_WHOLE_NUMBER_REGEXP.test('123')).toBe(true);
      expect(MarketUtils.POSITIVE_WHOLE_NUMBER_REGEXP.test('12a')).toBe(false);
    });
  });
});
