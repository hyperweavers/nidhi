import { DecimalPipe } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Constants } from '../constants';
import { ValueOrPlaceholderPipe } from './value-or-placeholder.pipe';

describe('ValueOrPlaceholderPipe', () => {
  let pipe: ValueOrPlaceholderPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ValueOrPlaceholderPipe,
        { provide: LOCALE_ID, useValue: 'en-US' },
      ],
    });
    pipe = TestBed.inject(ValueOrPlaceholderPipe);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return NO_VALUE placeholder for null, undefined, or empty string', () => {
    expect(pipe.transform(null)).toBe(Constants.placeholders.NO_VALUE);
    expect(pipe.transform(undefined)).toBe(Constants.placeholders.NO_VALUE);
    expect(pipe.transform('')).toBe(Constants.placeholders.NO_VALUE);
  });

  it('should return NO_VALUE placeholder for NaN', () => {
    expect(pipe.transform(NaN)).toBe(Constants.placeholders.NO_VALUE);
  });

  it('should format numbers correctly using the decimal pipe', () => {
    expect(pipe.transform(1234.567)).toBe('1,234.57');
    expect(pipe.transform(0)).toBe('0.00');
    expect(pipe.transform(1234.567, '1.1-1')).toBe('1,234.6');
  });

  it('should return NO_VALUE placeholder if decimal pipe transform returns null', () => {
    const spy = jest
      .spyOn(DecimalPipe.prototype, 'transform')
      .mockReturnValue(null);
    expect(pipe.transform(123)).toBe(Constants.placeholders.NO_VALUE);
    spy.mockRestore();
  });

  it('should return string representation for other primitive types', () => {
    expect(pipe.transform('test')).toBe('test');
    expect(pipe.transform(true)).toBe('true');
  });
});
