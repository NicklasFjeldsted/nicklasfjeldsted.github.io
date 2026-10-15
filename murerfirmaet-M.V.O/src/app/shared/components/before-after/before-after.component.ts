import {DecimalPipe} from '@angular/common';
import {Component, computed, input, signal} from '@angular/core';
import {IMasonryImage} from '../../../core/interfaces/masonry-page.interface';

const KEY_STEP = 5;

/**
 * Before/after image comparison. Drag (mouse, touch or pen) or use the arrow keys on the handle.
 * The "before" image sits on top and is revealed from the left; the "after" image is underneath.
 */
@Component({
  selector: 'mvo-before-after',
  imports: [DecimalPipe],
  templateUrl: './before-after.component.html',
  styleUrl: './before-after.component.scss',
  standalone: true,
})
export class BeforeAfterComponent {
  before = input.required<IMasonryImage>();
  after = input.required<IMasonryImage>();
  beforeLabel = input('Før');
  afterLabel = input('Efter');
  /** Start position of the divider in percent (0-100). */
  initial = input(50);

  protected readonly position = signal<number | null>(null);
  protected readonly current = computed(() => this.position() ?? this.initial());
  protected readonly dragging = signal(false);

  protected onPointerDown(event: PointerEvent, frame: HTMLElement): void {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    this.dragging.set(true);
    frame.setPointerCapture(event.pointerId);
    this.moveTo(event, frame);
  }

  protected onPointerMove(event: PointerEvent, frame: HTMLElement): void {
    if (this.dragging()) this.moveTo(event, frame);
  }

  protected onPointerUp(): void {
    this.dragging.set(false);
  }

  protected onKey(event: KeyboardEvent): void {
    const keys: Record<string, number> = {
      ArrowLeft: this.current() - KEY_STEP,
      ArrowDown: this.current() - KEY_STEP,
      ArrowRight: this.current() + KEY_STEP,
      ArrowUp: this.current() + KEY_STEP,
      Home: 0,
      End: 100,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    this.position.set(this.clamp(keys[event.key]));
  }

  private moveTo(event: PointerEvent, frame: HTMLElement): void {
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0) return;
    this.position.set(this.clamp(((event.clientX - rect.left) / rect.width) * 100));
  }

  private clamp(value: number): number {
    return Math.min(100, Math.max(0, value));
  }
}
