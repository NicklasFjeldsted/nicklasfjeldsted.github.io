import {Component, input, model, ViewEncapsulation} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'mvo-input',
  imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  standalone: true,
  encapsulation: ViewEncapsulation.None
})
export class InputComponent {
  label       = input<string>('');
  placeholder = input<string>('');
  type        = input<string>('text');
  control     = input<FormControl | null>(null);
  value       = model<string>('');
  required    = input<boolean>(false);
}
