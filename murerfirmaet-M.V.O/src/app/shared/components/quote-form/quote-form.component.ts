import {Component, computed, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {UpperCasePipe} from '@angular/common';
import {InputComponent} from '../input/input.component';
import {SelectComponent} from '../select/select.component';
import {TextareaComponent} from '../textarea/textarea.component';
import {UploadComponent} from '../upload/upload.component';
import {ButtonComponent} from '../button/button.component';
import {ButtonVariant} from '../../../core/enums/button-variant.enum';
import {ButtonSize} from '../../../core/enums/button-size.enum';
import {QUOTE_CATEGORIES} from '../../../core/constants/quote-categories.constants';

/** The "free, non-binding quote" form, shared by the front page and the contact page. */
@Component({
  selector: 'mvo-quote-form',
  imports: [ReactiveFormsModule, TranslatePipe, UpperCasePipe, InputComponent, SelectComponent, TextareaComponent, UploadComponent, ButtonComponent],
  templateUrl: './quote-form.component.html',
  standalone: true,
})
export class QuoteFormComponent {
  private readonly translate = inject(TranslateService);

  protected readonly form = new FormGroup({
    name: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    phone: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    email: new FormControl('', {nonNullable: true, validators: [Validators.email]}),
    category: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    message: new FormControl('', {nonNullable: true}),
  });

  protected readonly files = signal<File[]>([]);

  private readonly lang = signal(0);
  protected readonly categoryOptions = computed(() => {
    this.lang();
    return QUOTE_CATEGORIES.map(c => ({value: c, label: this.translate.instant(`quote.categories.${c}`)}));
  });

  constructor() {
    this.translate.onLangChange.subscribe(() => this.lang.update(v => v + 1));
    this.translate.onTranslationChange.subscribe(() => this.lang.update(v => v + 1));
  }

  protected readonly ButtonVariant = ButtonVariant;
  protected readonly ButtonSize = ButtonSize;
}
