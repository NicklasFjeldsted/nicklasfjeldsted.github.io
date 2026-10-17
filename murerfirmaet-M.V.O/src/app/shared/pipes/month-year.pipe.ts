import {Pipe, PipeTransform} from '@angular/core';

const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];

/** "2026-08-20" → "august 2026". */
@Pipe({name: 'monthYear', standalone: true})
export class MonthYearPipe implements PipeTransform {
  transform(isoDate: string): string {
    const [year, month] = isoDate.split('-').map(Number);
    return `${MONTHS[month - 1]} ${year}`;
  }
}
