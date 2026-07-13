import { Component, input, model } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {IDropdownOption} from '../../../core/interfaces/dropdown-option.interface';

@Component({
  selector: 'mvo-select',
  imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  standalone: true,
})
export class SelectComponent {
  label    = input<string>('');
  placeholder = input<string>('');
  options  = input<IDropdownOption[]>([]);
  control  = input<FormControl | null>(null);
  value    = model<string>('');
  required = input<boolean>(false);
}
