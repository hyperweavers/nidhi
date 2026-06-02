import { fakeAsync, tick } from '@angular/core/testing';

jest.mock('flowbite', () => ({
  initFlowbite: jest.fn(),
}));

import { initFlowbite } from 'flowbite';
import { Flowbite, initFlowbiteComponents } from './flowbite.decorator';

describe('FlowbiteDecorator', () => {
  beforeEach(() => {
    (initFlowbite as jest.Mock).mockClear();
    document.body.innerHTML = '';
  });

  describe('Flowbite decorator', () => {
    it('should wrap ngOnInit and call original then initFlowbiteComponents', fakeAsync(() => {
      const originalOnInit = jest.fn();
      const target = { prototype: { ngOnInit: originalOnInit } };

      Flowbite()(target);
      target.prototype.ngOnInit();
      tick(100);

      expect(originalOnInit).toHaveBeenCalled();
      expect(initFlowbite).toHaveBeenCalled();
    }));

    it('should not throw if original ngOnInit is undefined', fakeAsync(() => {
      const target = { prototype: {} };

      Flowbite()(target);
      expect(() => {
        target.prototype.ngOnInit();
        tick(100);
      }).not.toThrow();
    }));
  });

  describe('initFlowbiteComponents', () => {
    it('should call initFlowbite after queue delay', fakeAsync(() => {
      initFlowbiteComponents();
      expect(initFlowbite).not.toHaveBeenCalled();

      tick(100);
      expect(initFlowbite).toHaveBeenCalled();
    }));

    it('should call initFlowbite exactly once', fakeAsync(() => {
      initFlowbiteComponents();
      tick(100);
      expect(initFlowbite).toHaveBeenCalledTimes(1);
    }));

    it('should process elements with data- attribute', fakeAsync(() => {
      const div = document.createElement('div');
      div.setAttribute('data-', 'modal-target:myModal');
      document.body.appendChild(div);

      initFlowbiteComponents();
      tick(100);

      expect(initFlowbite).toHaveBeenCalled();
      expect(div.hasAttribute('flowbite-initialized')).toBe(true);
      expect(div.hasAttribute('data-')).toBe(false);
      expect(div.getAttribute('fb-')).toBe('modal-target:myModal');
    }));

    it('should skip element already marked as flowbite-initialized', fakeAsync(() => {
      const div = document.createElement('div');
      div.setAttribute('data-', 'test');
      div.setAttribute('flowbite-initialized', '');
      document.body.appendChild(div);

      initFlowbiteComponents();
      tick(100);

      expect(initFlowbite).toHaveBeenCalled();
      expect(div.getAttribute('data-')).toBeTruthy();
    }));

    it('should handle consecutive calls', fakeAsync(() => {
      initFlowbiteComponents();
      tick(100);
      initFlowbiteComponents();
      tick(100);

      expect(initFlowbite).toHaveBeenCalledTimes(2);
    }));
  });
});
