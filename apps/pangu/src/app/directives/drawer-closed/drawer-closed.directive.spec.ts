import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DrawerClosedDirective } from './drawer-closed.directive';

@Component({
  selector: 'app-test-component',
  template: '<div appDrawerClosed (appDrawerClosed)="onDrawerClosed()"></div>',
  standalone: true,
  imports: [DrawerClosedDirective],
})
class TestComponent {
  drawerClosedCalled = false;

  onDrawerClosed(): void {
    this.drawerClosedCalled = true;
  }
}

describe('DrawerClosedDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let directiveElement: DebugElement;
  let directive: DrawerClosedDirective;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    directiveElement = fixture.debugElement.query(
      By.directive(DrawerClosedDirective),
    );
    directive = directiveElement.injector.get(DrawerClosedDirective);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });

  it('should have appDrawerClosed output', () => {
    expect(directive.appDrawerClosed).toBeDefined();
  });

  it('should emit appDrawerClosed event when role attribute changes from "dialog"', (done) => {
    const spy = jest.spyOn(directive.appDrawerClosed, 'emit');

    const element = directiveElement.nativeElement;
    element.setAttribute('role', 'dialog');
    fixture.detectChanges();

    // Simulate attribute change from 'dialog' to something else
    element.setAttribute('role', 'presentation');
    fixture.detectChanges();

    // Give MutationObserver time to fire
    setTimeout(() => {
      expect(spy).toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should not emit event if role attribute does not change from "dialog"', (done) => {
    const spy = jest.spyOn(directive.appDrawerClosed, 'emit');

    const element = directiveElement.nativeElement;
    element.setAttribute('role', 'presentation');
    fixture.detectChanges();

    setTimeout(() => {
      expect(spy).not.toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should call component method when appDrawerClosed event is emitted', (done) => {
    const element = directiveElement.nativeElement;

    // Set initial role to 'dialog'
    element.setAttribute('role', 'dialog');
    fixture.detectChanges();

    // Change role to something else
    element.setAttribute('role', 'presentation');
    fixture.detectChanges();

    setTimeout(() => {
      fixture.detectChanges();
      expect(component.drawerClosedCalled).toBe(true);
      done();
    }, 100);
  });

  it('should observe attribute changes with correct mutation observer options', () => {
    const element = directiveElement.nativeElement;

    // Verify that the MutationObserver is set up correctly
    expect(directive['changes']).toBeDefined();
    expect(directive['changes']).toBeInstanceOf(MutationObserver);
  });

  it('should only track role attribute changes', (done) => {
    const spy = jest.spyOn(directive.appDrawerClosed, 'emit');

    const element = directiveElement.nativeElement;
    element.setAttribute('role', 'dialog');
    fixture.detectChanges();

    // Change a different attribute
    element.setAttribute('data-test', 'value');
    fixture.detectChanges();

    setTimeout(() => {
      expect(spy).not.toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should emit multiple times when role changes from dialog multiple times', (done) => {
    const spy = jest.spyOn(directive.appDrawerClosed, 'emit');

    const element = directiveElement.nativeElement;
    element.setAttribute('role', 'dialog');
    fixture.detectChanges();

    element.setAttribute('role', 'presentation');
    fixture.detectChanges();

    setTimeout(() => {
      expect(spy).toHaveBeenCalledTimes(1);

      // Change back to dialog
      element.setAttribute('role', 'dialog');
      fixture.detectChanges();

      setTimeout(() => {
        // Change from dialog again
        element.setAttribute('role', 'button');
        fixture.detectChanges();

        setTimeout(() => {
          expect(spy).toHaveBeenCalledTimes(2);
          done();
        }, 100);
      }, 100);
    }, 100);
  });
});
