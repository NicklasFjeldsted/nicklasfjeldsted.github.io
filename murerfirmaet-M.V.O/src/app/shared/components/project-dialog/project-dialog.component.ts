import {Component, ElementRef, HostListener, OnDestroy, OnInit, inject, input, output, viewChild} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRightLong, faCalendar, faLocationDot, faXmark} from '@fortawesome/free-solid-svg-icons';
import {IProject} from '../../../core/interfaces/project.interface';
import {MonthYearPipe} from '../../pipes/month-year.pipe';
import {ProjectViewerComponent} from '../project-viewer/project-viewer.component';

/** Popup with a project's images and short text, opened from the gallery on the Projekter page. */
@Component({
  selector: 'mvo-project-dialog',
  imports: [RouterLink, TranslatePipe, FaIconComponent, MonthYearPipe, ProjectViewerComponent],
  templateUrl: './project-dialog.component.html',
  styleUrl: './project-dialog.component.scss',
  standalone: true,
})
export class ProjectDialogComponent implements OnInit, OnDestroy {
  project = input.required<IProject>();
  startIndex = input(0);
  closed = output<void>();

  private readonly viewer = viewChild.required(ProjectViewerComponent);
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly previousFocus = document.activeElement as HTMLElement | null;

  protected readonly faXmark = faXmark;
  protected readonly faArrowRightLong = faArrowRightLong;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faCalendar = faCalendar;

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => this.closeButton().nativeElement.focus());
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.previousFocus?.focus();
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closed.emit();
    if (event.key === 'ArrowLeft') this.viewer().step(-1);
    if (event.key === 'ArrowRight') this.viewer().step(1);
  }
}
