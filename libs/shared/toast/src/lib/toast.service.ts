import { Injectable, InjectionToken, inject, signal } from '@angular/core';

export const TOAST_DISMISS_TIMEOUT = new InjectionToken<number>(
  'TOAST_DISMISS_TIMEOUT',
  { factory: () => 3000 },
);

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
}

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  public readonly toasts = signal<Toast[]>([]);

  private counter = 0;
  private readonly dismissTimeout = inject(TOAST_DISMISS_TIMEOUT);

  public show(message: string, type: ToastType = ToastType.SUCCESS): void {
    const id = ++this.counter;
    this.toasts.update((list) => [...list, { id, message, type }]);
    setTimeout(() => this.dismiss(id), this.dismissTimeout);
  }

  public dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
