import {Component, DestroyRef, effect, inject, input, output, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {AdminApiService} from '../admin-api.service';
import {IApiError, INotice, ISectionContent, fieldMessages} from '../admin.models';

const MAX_DETAILS = 20;

@Component({
  selector: 'mvo-section-text-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './section-text-editor.component.html',
})
export class SectionTextEditorComponent {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);

  readonly section = input.required<ISectionContent>();
  readonly sectionChange = output<ISectionContent>();
  readonly dirtyChange = output<boolean>();
  /** The section as it would look with the unsaved text, for the preview. */
  readonly draftChange = output<ISectionContent>();
  readonly notify = output<INotice>();

  protected readonly saving = signal(false);
  protected readonly serverFields = signal<Record<string, string[]>>({});
  protected readonly maxDetails = MAX_DETAILS;

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    eyebrow: ['', Validators.maxLength(500)],
    introduction: ['', Validators.maxLength(4000)],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    additionalDescription: ['', Validators.maxLength(4000)],
    details: this.fb.nonNullable.array<string>([]),
  });

  constructor() {
    effect(() => {
      this.load(this.section());
      this.dirtyChange.emit(false);
      this.emitDraft();
    });
    this.form.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.dirtyChange.emit(this.form.dirty);
      this.emitDraft();
    });
  }

  protected get details() {
    return this.form.controls.details;
  }

  protected serverError(name: string): string[] {
    return fieldMessages(this.serverFields(), name);
  }

  protected addDetail(): void {
    if (this.details.length >= MAX_DETAILS) return;
    this.details.push(this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(300)]));
    this.form.markAsDirty();
    this.dirtyChange.emit(true);
  }

  protected removeDetail(index: number): void {
    this.details.removeAt(index);
    this.form.markAsDirty();
    this.dirtyChange.emit(true);
  }

  protected cancel(): void {
    this.load(this.section());
    this.dirtyChange.emit(false);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const v = this.form.getRawValue();
    const s = this.section();
    this.saving.set(true);
    this.api.updateSectionText(s.pageId, s.id, s.version, {
      title: v.title.trim(),
      eyebrow: v.eyebrow.trim() || null,
      introduction: v.introduction.trim() || null,
      description: v.description.trim(),
      additionalDescription: v.additionalDescription.trim() || null,
      details: v.details.map(d => d.trim()).filter(d => d.length > 0),
    }).subscribe({
      next: updated => {
        this.saving.set(false);
        this.sectionChange.emit(updated);
        this.notify.emit({kind: 'success', text: 'Sektionens tekst er gemt.'});
      },
      error: (error: IApiError) => {
        this.saving.set(false);
        this.serverFields.set(error.fields);
        this.notify.emit({
          kind: 'error',
          text: error.status === 409
            ? 'Indholdet er ændret af en anden, siden du åbnede det. Dine ændringer er bevaret her, men er ikke gemt. Kopiér dem, og genindlæs sektionen.'
            : `Kunne ikke gemme. ${error.message}`,
        });
      },
    });
  }

  private emitDraft(): void {
    const v = this.form.getRawValue();
    this.draftChange.emit({
      ...this.section(),
      title: v.title,
      eyebrow: v.eyebrow.trim() || null,
      introduction: v.introduction.trim() || null,
      description: v.description,
      additionalDescription: v.additionalDescription.trim() || null,
      details: v.details.map(d => d.trim()).filter(d => d.length > 0),
    });
  }

  private load(section: ISectionContent): void {
    this.form.controls.details.clear();
    section.details.forEach(d => this.form.controls.details.push(this.fb.nonNullable.control(d, [Validators.required, Validators.maxLength(300)])));
    this.form.reset({
      title: section.title,
      eyebrow: section.eyebrow ?? '',
      introduction: section.introduction ?? '',
      description: section.description,
      additionalDescription: section.additionalDescription ?? '',
      details: section.details,
    });
    this.serverFields.set({});
  }
}
