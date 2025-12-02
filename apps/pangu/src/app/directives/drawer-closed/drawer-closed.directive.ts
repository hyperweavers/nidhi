import {
  Directive,
  ElementRef,
  EventEmitter,
  Output,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appDrawerClosed]',
  standalone: true,
})
export class DrawerClosedDirective {
  private elementRef = inject(ElementRef);

  @Output() appDrawerClosed = new EventEmitter<void>();

  private changes: MutationObserver;

  constructor() {
    const element = this.elementRef.nativeElement;

    this.changes = new MutationObserver((mutations: MutationRecord[]) => {
      mutations.forEach(
        (mutation: MutationRecord) =>
          mutation.oldValue === 'dialog' && this.appDrawerClosed.emit(),
      );
    });

    this.changes.observe(element, {
      attributeFilter: ['role'],
      attributeOldValue: true,
    });
  }
}
