import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';

import { ValueOrPlaceholderPipe } from './value-or-placeholder.pipe';
import { Constants } from '../constants';

describe('ValueOrPlaceholderPipe', () => {
  let pipe: ValueOrPlaceholderPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ValueOrPlaceholderPipe, { provide: LOCALE_ID, useValue: 'en-US' }],
    });
    pipe = TestBed.inject(ValueOrPlaceholderPipe);
  });

  describe('nullish values', () => {
    it('should return placeholder for null', () => {
      expect(pipe.transform(null)).toBe(Constants.placeholders.NO_VALUE);
    });

    it('should return placeholder for undefined', () => {
      expect(pipe.transform(undefined)).toBe(Constants.placeholders.NO_VALUE);
    });

    it('should return placeholder for empty string', () => {
      expect(pipe.transform('')).toBe(Constants.placeholders.NO_VALUE);
    });
  });

  describe('number values', () => {
    it('should format a number with default format', () => {
      expect(pipe.transform(1234.5678)).toBe('1,234.57');
    });

    it('should format a number with custom format', () => {
      expect(pipe.transform(1234.5678, '1.0-0')).toBe('1,235');
    });

    it('should format zero', () => {
      expect(pipe.transform(0)).toBe('0.00');
    });

    it('should return string "NaN" for NaN since it bypasses number formatting', () => {
      expect(pipe.transform(NaN)).toBe('NaN');
    });
  });

  describe('string values', () => {
    it('should return the string as-is', () => {
      expect(pipe.transform('hello')).toBe('hello');
    });

    it('should return string representation of non-number objects', () => {
      expect(pipe.transform({})).toBe('[object Object]');
    });
  });

  describe('boolean values', () => {
    it('should return "true" for true', () => {
      expect(pipe.transform(true)).toBe('true');
    });

    it('should return "false" for false', () => {
      expect(pipe.transform(false)).toBe('false');
    });
  });
});
