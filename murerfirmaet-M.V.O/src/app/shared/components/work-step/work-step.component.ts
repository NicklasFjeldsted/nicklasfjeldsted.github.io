import {Component, input} from '@angular/core';
import {IWorkStep} from '../../../core/interfaces/work-step.interface';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'mvo-work-step',
  imports: [FaIconComponent],
  templateUrl: './work-step.component.html',
  styleUrl: './work-step.component.scss',
  standalone: true
})
export class WorkStepComponent {
  workStep = input.required<IWorkStep>();
}
