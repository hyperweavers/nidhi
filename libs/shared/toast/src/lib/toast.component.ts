import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService, ToastType } from './toast.service';

@Component({
  selector: 'lib-toast',
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  public readonly toastService = inject(ToastService);

  public readonly ToastType = ToastType;
}
