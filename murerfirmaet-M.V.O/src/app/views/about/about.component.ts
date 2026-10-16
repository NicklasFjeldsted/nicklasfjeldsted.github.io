import {Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRightLong, faHandshake, faRulerCombined, faUserCheck} from '@fortawesome/free-solid-svg-icons';
import {AboutContentService} from '../../core/services/about-content.service';
import {AboutProfileComponent} from '../../shared/components/about-profile/about-profile.component';

@Component({
  selector: 'mvo-about',
  imports: [RouterLink, TranslatePipe, FaIconComponent, AboutProfileComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  standalone: true,
})
export class AboutComponent {
  protected readonly profile = toSignal(inject(AboutContentService).getAboutPage());
  protected readonly faArrowRightLong = faArrowRightLong;

  protected readonly values = [
    {icon: faRulerCombined, key: 'about.values.quality'},
    {icon: faHandshake, key: 'about.values.honest'},
    {icon: faUserCheck, key: 'about.values.direct'},
  ];
}
