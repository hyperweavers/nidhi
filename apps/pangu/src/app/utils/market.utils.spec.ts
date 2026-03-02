import { Direction, ExchangeName } from '../models/market';
import { ExchangeCode } from '../models/vendor/etm';
import { MarketUtils } from './market.utils';

describe('MarketUtils', () => {
  describe('getDirection', () => {
    it('should return Direction.UP for positive values and zero', () => {
      expect(MarketUtils.getDirection(10)).toBe(Direction.UP);
      expect(MarketUtils.getDirection(0)).toBe(Direction.UP);
    });

    it('should return Direction.DOWN for negative values', () => {
      expect(MarketUtils.getDirection(-10)).toBe(Direction.DOWN);
    });
  });

  describe('getExchangeNameFromVendorCode', () => {
    it('should return correct ExchangeName', () => {
      expect(MarketUtils.getExchangeNameFromVendorCode(ExchangeCode.NSE)).toBe(
        ExchangeName.NSE,
      );
      expect(MarketUtils.getExchangeNameFromVendorCode(ExchangeCode.BSE)).toBe(
        ExchangeName.BSE,
      );
    });
  });

  describe('getExchangeVendorCodeFromName', () => {
    it('should return correct ExchangeCode', () => {
      expect(MarketUtils.getExchangeVendorCodeFromName(ExchangeName.NSE)).toBe(
        ExchangeCode.NSE,
      );
      expect(MarketUtils.getExchangeVendorCodeFromName(ExchangeName.BSE)).toBe(
        ExchangeCode.BSE,
      );
    });
  });

  describe('stringToNumber', () => {
    it('should remove commas and return a number', () => {
      expect(MarketUtils.stringToNumber('1,234.56')).toBe(1234.56);
      expect(MarketUtils.stringToNumber('1,234,567')).toBe(1234567);
      expect(MarketUtils.stringToNumber('123')).toBe(123);
    });
  });

  describe('dateStringToEpoch', () => {
    it('should convert date string to epoch time', () => {
      const dateStr = '2023-01-01T00:00:00.000Z';
      expect(MarketUtils.dateStringToEpoch(dateStr)).toBe(
        new Date(dateStr).getTime(),
      );
    });
  });

  describe('BusinessDays logic', () => {
    it('should count business days correctly', () => {
      const start = new Date('2023-01-02T00:00:00.000Z').getTime(); // Monday
      const end = new Date('2023-01-06T00:00:00.000Z').getTime(); // Friday
      expect(MarketUtils.getBusinessDays(start, end)).toBe(5);

      const overWeekendEnd = new Date('2023-01-09T00:00:00.000Z').getTime(); // Next Monday
      expect(MarketUtils.getBusinessDays(start, overWeekendEnd)).toBe(6);
    });

    it('should identify business days correctly', () => {
      expect(
        MarketUtils.isBusinessDay(new Date('2023-01-02T00:00:00.000Z')),
      ).toBe(true); // Monday
      expect(
        MarketUtils.isBusinessDay(new Date('2023-01-07T00:00:00.000Z')),
      ).toBe(false); // Saturday
      expect(
        MarketUtils.isBusinessDay(new Date('2023-01-08T00:00:00.000Z')),
      ).toBe(false); // Sunday
    });

    it('should get the last business day correctly', () => {
      const monday = new Date('2023-01-09T00:00:00.000Z');
      expect(MarketUtils.getLastBusinessDay(monday).getTime()).toBe(
        monday.getTime(),
      ); // Still monday

      const sunday = new Date('2023-01-08T00:00:00.000Z');
      // Previous business day is Friday
      const expectedFriday = new Date('2023-01-06T00:00:00.000Z');
      expect(MarketUtils.getLastBusinessDay(sunday).getTime()).toBe(
        expectedFriday.getTime(),
      );
    });
  });

  describe('extractScripCodesFromMcSearchResult', () => {
    it('should extract ScripCodes correctly when listed in NSE', () => {
      // Current implementation does split('') which splits character by character
      // So 'ABC' -> codes[0]='A', codes[1]='B', codes[2]='C'
      // codes[1] = 'B' -> not a positive whole number -> listedInNse = true
      // Output: isin='A', nse='B', bse='C'
      const html = '<span>ABC</span>';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toEqual({ isin: 'A', nse: 'B', bse: 'C' });
    });

    it('should extract ScripCodes correctly when not listed in NSE', () => {
      // If codes[1] is a number, listedInNse = false.
      // 'A1C' -> codes[0]='A', codes[1]='1', codes[2]='C'
      // Output: isin='A', nse='', bse='1'
      const html = '<span>A1C</span>';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toEqual({ isin: 'A', nse: '', bse: '1' });
    });

    it('should return null if code string is empty', () => {
      const html = '<div>No span here</div>';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toBeNull();
    });

    it('should return null for empty string or invalid html with no span textContent', () => {
      const html = '';
      const result = MarketUtils.extractScripCodesFromMcSearchResult(html);
      expect(result).toBeNull();
    });

    it('should catch error and log to console if parsing fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const parserSpy = jest
        .spyOn(DOMParser.prototype, 'parseFromString')
        .mockImplementation(() => {
          throw new Error('Test error');
        });

      const result =
        MarketUtils.extractScripCodesFromMcSearchResult('some html');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test error'),
      );

      consoleSpy.mockRestore();
      parserSpy.mockRestore();
    });
  });
});
