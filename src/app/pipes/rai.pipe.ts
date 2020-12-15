import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'badem'
})
export class RaiPipe implements PipeTransform {
  precision = 6;

  mbadem = 100;
  kbadem = 100;
  badem  = 1;

  transform(value: any, args?: any): any {
    const opts = args.split(',');
    const denomination = opts[0] || 'mbadem';
    const hideText = opts[1] || false;

    switch (denomination.toLowerCase()) {
      default:
      case 'badem': return `${(value / this.mbadem).toFixed(6)}${!hideText ? ' BADEM' : ''}`;
      case 'mbadem':
        const hasRawValue = (value / this.badem) % 1;
        if (hasRawValue) {
          // New more precise toFixed function, but bugs on huge raw numbers
          const newVal = value / this.mbadem < 0.000001 ? 0 : value / this.mbadem;
          return `${this.toFixed(newVal, this.precision)}${!hideText ? ' BADEM' : ''}`;
        } else {
          return `${(value / this.mbadem).toFixed(6)}${!hideText ? ' BADEM' : ''}`;
        }
      case 'kbadem': return `${(value / this.kbadem).toFixed(3)}${!hideText ? ' kbadem' : ''}`;
      case 'badem': return `${(value / this.badem).toFixed(0)}${!hideText ? ' badem' : ''}`;
      case 'raw': return `${value}${!hideText ? ' raw' : ''}`;
      case 'dynamic':
        const badem = (value / this.badem);
        if (badem >= 1000000) {
          return `${(value / this.mbadem).toFixed(this.precision)}${!hideText ? ' mBadem' : ''}`;
        } else if (badem >= 1000) {
          return `${(value / this.kbadem).toFixed(this.precision)}${!hideText ? ' kBadem' : ''}`;
        } else if (badem >= 0.00001) {
          return `${(value / this.badem).toFixed(this.precision)}${!hideText ? ' Badem' : ''}`;
        } else if (badem === 0) {
          return `${value}${!hideText ? ' mBadem' : ''}`;
        } else {
          return `${value}${!hideText ? ' badem' : ''}`;
        }
    }
  }

  toFixed(num, fixed) {
    if (isNaN(num)) {
      return 0;
    }
    const re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');
    return num.toString().match(re)[0];
  }

}
