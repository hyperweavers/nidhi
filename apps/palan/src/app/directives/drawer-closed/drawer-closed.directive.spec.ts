import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DrawerClosedDirective } from './drawer-closed.directive';

@Component({
  standalone: true,
  selector: 'app-test-component',
  template:
    '<dialog class="test-dialog" role="dialog" (appDrawerClosed)="close()">test</dialog>',
})
export class TestComponent {
  close() {
    // mock
  }
}

describe('DrawerClosedDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let inputEl: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent, DrawerClosedDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    fixture.componentInstance;
    fixture.detectChanges();
    inputEl = fixture.debugElement.query(By.css('.test-dialog'));
  });

  it('should create an instance', () => {
    const directive = new DrawerClosedDirective(inputEl);
    expect(directive).toBeTruthy();
  });
});
