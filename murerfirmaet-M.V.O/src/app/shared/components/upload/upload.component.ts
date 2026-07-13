import { Component, model } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faUpload, faFile, faXmark } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'mvo-upload',
  imports: [FaIconComponent],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss',
  standalone: true,
})
export class UploadComponent {
  files = model<File[]>([]);

  protected readonly faUpload = faUpload;
  protected readonly faFile   = faFile;
  protected readonly faXmark  = faXmark;

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    if (!event.dataTransfer?.files) return;
    const incoming = Array.from(event.dataTransfer.files);
    this.files.update(existing => [...existing, ...incoming]);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const incoming = Array.from(input.files);
    this.files.update(existing => [...existing, ...incoming]);
    input.value = '';
  }

  protected removeFile(index: number): void {
    this.files.update(existing => existing.filter((_, i) => i !== index));
  }

  protected fileExtension(file: File): string {
    return file.name.split('.').pop()?.toUpperCase() ?? '';
  }

  protected fileName(file: File): string {
    const parts = file.name.split('.');
    parts.pop();
    return parts.join('.');
  }
}
