import {Component, DestroyRef, effect, inject, input, output, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {AdminApiService} from '../admin-api.service';
import {IApiError, INotice, IPageDetail, fieldMessages} from '../admin.models';

@Component({
  selector: 'mvo-page-text-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './page-text-editor.component.html',
})
export class PageTextEditorComponent {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);

  readonly page = input.required<IPageDetail>();
  readonly pageChange = output<IPageDetail>();
  readonly dirtyChange = output<boolean>();
  /** The page as it would look with the unsaved text, for the preview. */
  readonly draftChange = output<IPageDetail>();
  readonly notify = output<INotice>();

  protected readonly saving = signal(false);
  protected readonly serverFields = signal<Record<string, string[]>>({});

  protected readonly form = this.fb.nonNullable.group({
    eyebrow: ['', Validators.maxLength(500)],
    heading: ['', [Validators.required, Validators.maxLength(200)]],
    introduction: ['', [Validators.required, Validators.maxLength(4000)]],
  });

  constructor() {
    effect(() => {
      const page = this.page();
      this.form.reset({eyebrow: page.eyebrow ?? '', heading: page.heading, introduction: page.introduction});
      this.serverFields.set({});
      this.dirtyChange.emit(false);
      this.emitDraft();
    });
    this.form.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.dirtyChange.emit(this.form.dirty);
      this.emitDraft();
    });
  }

  private emitDraft(): void {
    const v = this.form.getRawValue();
    this.draftChange.emit({...this.page(), eyebrow: v.eyebrow.trim() || null, heading: v.heading, introduction: v.introduction});
  }

  protected serverError(name: string): string[] {
    return fieldMessages(this.serverFields(), name);
  }

  protected cancel(): void {
    this.form.reset({
      eyebrow: this.page().eyebrow ?? '',
      heading: this.page().heading,
      introduction: this.page().introduction,
    });
    this.serverFields.set({});
    this.dirtyChange.emit(false);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.api.updatePageText(this.page().id, this.page().version, value.eyebrow.trim() || null, value.heading.trim(), value.introduction.trim())
      .subscribe({
        next: page => {
          this.saving.set(false);
          this.pageChange.emit(page);
          this.notify.emit({kind: 'success', text: 'Sidens tekst er gemt.'});
        },
        error: (error: IApiError) => {
          this.saving.set(false);
          this.serverFields.set(error.fields);
          this.notify.emit({kind: 'error', text: `Kunne ikke gemme. ${error.message}`});
        },
      });
  }
}
