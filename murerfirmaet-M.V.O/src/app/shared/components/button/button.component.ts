import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { ButtonVariant } from '../../../core/enums/button-variant.enum';
import { ButtonSize } from '../../../core/enums/button-size.enum';
import { ButtonIconPosition, ButtonIconSize } from '../../../core/enums/button-icon.enum';

@Component({
  selector: 'mvo-button',
  imports: [MatButtonModule, FaIconComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  standalone: true
})
export class ButtonComponent {
  variant = input<ButtonVariant>(ButtonVariant.Primary);
  size = input<ButtonSize>(ButtonSize.Md);
  label = input<string>('');
  icon = input<IconProp | null>(null);
  iconSize = input<ButtonIconSize>('sm');
  iconPosition = input<ButtonIconPosition>(ButtonIconPosition.Left);
  disabled = input<boolean>(false);
  fullWidth = input<boolean>(false);
  additionalClasses = input<string>('');
  onClick = output<MouseEvent>();
}
