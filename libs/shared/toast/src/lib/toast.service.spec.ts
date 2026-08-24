import { TestBed } from '@angular/core/testing';

import { ToastService, ToastType } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start with empty toasts', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('should add a toast on show()', () => {
    service.show('Hello');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Hello');
    expect(service.toasts()[0].type).toBe(ToastType.SUCCESS);
  });

  it('should add a toast with custom type', () => {
    service.show('Error!', ToastType.ERROR);
    expect(service.toasts()[0].type).toBe(ToastType.ERROR);
  });

  it('should auto-dismiss after the configured timeout', () => {
    service.show('Auto dismiss');
    expect(service.toasts().length).toBe(1);
    jest.advanceTimersByTime(3000);
    expect(service.toasts().length).toBe(0);
  });

  it('should dismiss a specific toast by id', () => {
    service.show('First');
    const id = service.toasts()[0].id;
    service.show('Second');
    expect(service.toasts().length).toBe(2);
    service.dismiss(id);
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Second');
  });

  it('should increment ids for each toast', () => {
    service.show('A');
    const idA = service.toasts()[0].id;
    service.show('B');
    const idB = service.toasts()[1].id;
    expect(idB).toBe(idA + 1);
  });
});
