import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ToastComponent } from './toast.component';
import { ToastService, ToastType } from './toast.service';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
    }).compileComponents();

    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show success toast with green background', () => {
    toastService.show('Stock added!');
    fixture.detectChanges();
    const toastEl = fixture.debugElement.query(By.css('[role="alert"]'));
    expect(toastEl).toBeTruthy();
    expect(toastEl.nativeElement.textContent).toContain('Stock added!');
    expect(toastEl.nativeElement.classList).toContain('bg-green-600');
  });

  it('should show error toast with red background', () => {
    toastService.show('Something went wrong', ToastType.ERROR);
    fixture.detectChanges();
    const toastEl = fixture.debugElement.query(By.css('[role="alert"]'));
    expect(toastEl).toBeTruthy();
    expect(toastEl.nativeElement.textContent).toContain('Something went wrong');
    expect(toastEl.nativeElement.classList).toContain('bg-red-600');
  });

  it('should show info toast with blue background', () => {
    toastService.show('Info message', ToastType.INFO);
    fixture.detectChanges();
    const toastEl = fixture.debugElement.query(By.css('[role="alert"]'));
    expect(toastEl).toBeTruthy();
    expect(toastEl.nativeElement.textContent).toContain('Info message');
    expect(toastEl.nativeElement.classList).toContain('bg-blue-600');
  });

  it('should dismiss toast when dismiss button is clicked', () => {
    toastService.show('Dismiss me');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('[role="alert"]')).length).toBe(
      1,
    );
    const dismissBtn = fixture.debugElement.query(
      By.css('button[type="button"]'),
    );
    dismissBtn.nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('[role="alert"]')).length).toBe(
      0,
    );
  });

  it('should render multiple toasts', () => {
    toastService.show('First');
    toastService.show('Second');
    toastService.show('Third');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('[role="alert"]')).length).toBe(
      3,
    );
  });
});
