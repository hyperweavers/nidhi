import { Directive, ElementRef, EventEmitter, Output } from '@angular/core';

@Directive({
  selector: '[appDrawerClosed]',
  standalone: true,
})
export class DrawerClosedDirective {
  @Output() appDrawerClosed = new EventEmitter<void>();

  private changes: MutationObserver;

  constructor(private elementRef: ElementRef) {
    const element = this.elementRef.nativeElement;

    this.changes = new MutationObserver((mutations: MutationRecord[]) => {
      mutations.forEach(
        (mutation: MutationRecord) =>
          mutation.oldValue === 'dialog' && this.appDrawerClosed.emit()
      );
    });

    this.changes.observe(element, {
      attributeFilter: ['role'],
      attributeOldValue: true,
    });
  }
}
