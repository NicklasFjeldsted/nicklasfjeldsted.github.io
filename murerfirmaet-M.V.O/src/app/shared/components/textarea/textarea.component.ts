import { Component, input, model } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'mvo-textarea',
  imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.scss',
  standalone: true,
})
export class TextareaComponent {
  label       = input<string>('');
  placeholder = input<string>('');
  rows        = input<number>(3);
  control     = input<FormControl | null>(null);
  value       = model<string>('');
  required    = input<boolean>(false);
}
