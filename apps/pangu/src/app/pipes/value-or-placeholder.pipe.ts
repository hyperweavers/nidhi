import { DecimalPipe } from '@angular/common';
import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

import { Constants } from '../constants';

@Pipe({
  name: 'valueOrPlaceholder',
  standalone: true,
})
export class ValueOrPlaceholderPipe implements PipeTransform {
  constructor(@Inject(LOCALE_ID) private locale: string) {}

  transform(value: unknown, format = '1.2-2'): string {
    if (value === null || value === undefined || value === '') {
      return Constants.placeholders.NO_VALUE;
    }

    if (typeof value === 'number' && !isNaN(value)) {
      const decimal = new DecimalPipe(this.locale);
      const formatted = decimal.transform(value, format);
      return formatted ?? Constants.placeholders.NO_VALUE;
    }

    return String(value);
  }
}
