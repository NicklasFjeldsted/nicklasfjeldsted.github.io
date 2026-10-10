import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule} from '@angular/material/dialog';
import {firstValueFrom} from 'rxjs';
import {Injectable} from '@angular/core';

export interface IConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

@Component({
  selector: 'mvo-confirm-dialog',
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="adm-btn" [mat-dialog-close]="false" cdkFocusInitial>{{ data.cancelLabel ?? 'Annullér' }}</button>
      <button type="button" class="adm-btn" [class.adm-btn--danger]="data.destructive" [class.adm-btn--primary]="!data.destructive"
              [mat-dialog-close]="true">{{ data.confirmLabel }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<IConfirmOptions>(MAT_DIALOG_DATA);
}

@Injectable({providedIn: 'root'})
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  ask(options: IConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<ConfirmDialogComponent, IConfirmOptions, boolean>(ConfirmDialogComponent, {
      data: options,
      maxWidth: '28rem',
      autoFocus: false,
    });
    return firstValueFrom(ref.afterClosed()).then(result => result === true);
  }

  /** Standard warning shown before unsaved edits are thrown away. */
  discardChanges(): Promise<boolean> {
    return this.ask({
      title: 'Du har ugemte ændringer',
      message: 'Hvis du fortsætter, mister du de ændringer, du ikke har gemt.',
      confirmLabel: 'Kassér ændringer',
      cancelLabel: 'Tilbage til redigering',
      destructive: true,
    });
  }
}
