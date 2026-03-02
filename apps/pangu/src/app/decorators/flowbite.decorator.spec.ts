import { fakeAsync, tick } from '@angular/core/testing';
import * as flowbite from 'flowbite';
import { Flowbite } from './flowbite.decorator';

jest.mock('flowbite', () => ({
  initFlowbite: jest.fn(),
}));

@Flowbite()
class MockComponent {
  ngOnInitCalled = false;
  ngOnInit() {
    this.ngOnInitCalled = true;
  }
}

@Flowbite()
class MockComponentWithoutOnInit {
  // Component without explicitly defined ngOnInit
}

describe('Flowbite Decorator', () => {
  it('should call original ngOnInit and initFlowbite components on queue execution', fakeAsync(() => {
    const instance = new MockComponent();

    // Add a dummy element for the logic to find
    const div = document.createElement('div');
    div.setAttribute('data-test', 'test');
    document.body.appendChild(div);

    instance.ngOnInit();

    // The decorator uses RxJS subject with delay(100)
    tick(150);

    expect(instance.ngOnInitCalled).toBe(true);
    // Elements with data-* should get flowbite-initialized and fb- attributes
    expect(div.getAttribute('flowbite-initialized')).toBe('');
    expect(div.getAttribute('fb-test')).toBe('test');
    expect(flowbite.initFlowbite).toHaveBeenCalled();

    document.body.removeChild(div);
  }));

  it('should handle components without ngOnInit method', fakeAsync(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = new MockComponentWithoutOnInit() as any;

    // this shouldn't crash
    instance.ngOnInit();
    tick(150);

    expect(flowbite.initFlowbite).toHaveBeenCalled();
  }));

  it('should ignore elements that are already initialized', fakeAsync(() => {
    const instance = new MockComponent();

    // element with existing flowbite-initialized attribute
    const div = document.createElement('div');
    div.setAttribute('data-test', 'test');
    div.setAttribute('flowbite-initialized', '');
    document.body.appendChild(div);

    // Call ngOnInit to trigger initialization
    instance.ngOnInit();

    tick(150);

    // Because it was already initialized, data-test should NOT be replaced internally by fb-test
    expect(div.getAttribute('fb-test')).toBeNull();
    expect(div.getAttribute('data-test')).toBe('test');

    document.body.removeChild(div);
  }));
});
