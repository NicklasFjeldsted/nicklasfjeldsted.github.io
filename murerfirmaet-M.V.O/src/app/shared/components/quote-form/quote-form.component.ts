import {Component, computed, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {UpperCasePipe} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleCheck} from '@fortawesome/free-regular-svg-icons';
import {InputComponent} from '../input/input.component';
import {SelectComponent} from '../select/select.component';
import {TextareaComponent} from '../textarea/textarea.component';
import {UploadComponent} from '../upload/upload.component';
import {ButtonComponent} from '../button/button.component';
import {ButtonVariant} from '../../../core/enums/button-variant.enum';
import {ButtonSize} from '../../../core/enums/button-size.enum';
import {QUOTE_CATEGORIES} from '../../../core/constants/quote-categories.constants';
import {ContactConstants} from '../../../core/constants/contact.constants';
import {QuoteRequestService} from '../../../core/services/quote-request.service';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

type FormState = 'idle' | 'sending' | 'sent';

/** The "free, non-binding quote" form, shared by the front page and the contact page. */
@Component({
  selector: 'mvo-quote-form',
  imports: [ReactiveFormsModule, TranslatePipe, UpperCasePipe, FaIconComponent, InputComponent, SelectComponent, TextareaComponent, UploadComponent, ButtonComponent],
  templateUrl: './quote-form.component.html',
  standalone: true,
})
export class QuoteFormComponent {
  private readonly translate = inject(TranslateService);
  private readonly quotes = inject(QuoteRequestService);

  protected readonly form = new FormGroup({
    name: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.maxLength(100)]}),
    phone: new FormControl('', {nonNullable: true, validators: [Validators.required, Validators.pattern(/^[0-9+()\s-]{6,30}$/)]}),
    email: new FormControl('', {nonNullable: true, validators: [Validators.email, Validators.maxLength(200)]}),
    category: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    message: new FormControl('', {nonNullable: true, validators: [Validators.maxLength(5000)]}),
    website: new FormControl('', {nonNullable: true}),
  });

  protected readonly files = signal<File[]>([]);
  protected readonly state = signal<FormState>('idle');
  protected readonly errorKey = signal<string | null>(null);
  protected readonly sentToEmail = signal(false);

  private readonly lang = signal(0);
  protected readonly categoryOptions = computed(() => {
    this.lang();
    return QUOTE_CATEGORIES.map(c => ({value: c, label: this.translate.instant(`quote.categories.${c}`)}));
  });

  constructor() {
    this.translate.onLangChange.subscribe(() => this.lang.update(v => v + 1));
    this.translate.onTranslationChange.subscribe(() => this.lang.update(v => v + 1));
  }

  protected submit(): void {
    if (this.state() === 'sending') return;
    this.errorKey.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorKey.set('quote.errors.fields');
      return;
    }
    const files = this.files();
    if (files.length > MAX_FILES || files.some(f => f.size > MAX_FILE_BYTES) || files.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) {
      this.errorKey.set('quote.errors.files');
      return;
    }

    const value = this.form.getRawValue();
    this.state.set('sending');
    this.quotes.send({...value, files}).subscribe({
      next: () => {
        this.sentToEmail.set(!!value.email.trim());
        this.state.set('sent');
        this.form.reset();
        this.files.set([]);
      },
      error: (err: HttpErrorResponse) => {
        this.state.set('idle');
        this.errorKey.set(err.status === 400 ? 'quote.errors.fields' : err.status === 429 ? 'quote.errors.tooMany' : 'quote.errors.server');
      },
    });
  }

  protected sendAnother(): void {
    this.state.set('idle');
  }

  protected readonly phoneNumber = ContactConstants.PHONE_NUMBER;
  protected readonly faCircleCheck = faCircleCheck;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly ButtonSize = ButtonSize;
}
