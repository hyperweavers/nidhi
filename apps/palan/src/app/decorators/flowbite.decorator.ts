// Refer:
// 1. https://gist.github.com/OmarMtya/9ce68c563893d1c774f11a94ea73a31c
// 2. https://github.com/themesberg/flowbite/issues/579
import { initFlowbite } from 'flowbite';
import { Subject, concatMap, delay, of } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flowbiteQueue = new Subject<any>();

flowbiteQueue
  .pipe(concatMap((item) => of(item).pipe(delay(100))))
  .subscribe((x) => {
    x();
  });

export const Flowbite = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any) => {
    const originalOnInit = target.prototype.ngOnInit;
    target.prototype.ngOnInit = function () {
      if (originalOnInit) {
        originalOnInit.apply(this);
      }
      initFlowbiteComponents();
    };
  };
};

export const initFlowbiteComponents = () => {
  flowbiteQueue.next(() => {
    const elements = document.querySelectorAll('*');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flowbiteElements: any[] = [];
    const initializedElements = Array.from(
      document.querySelectorAll('[flowbite-initialized]'),
    );

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const attributes = element.attributes;

      for (let j = 0; j < attributes.length; j++) {
        const attribute = attributes[j];

        if (attribute.name.startsWith('data-')) {
          // add to the flowbiteElements array if it doesn't exist
          if (
            !flowbiteElements.includes(element) &&
            !initializedElements.find((x) => x.isEqualNode(element))
          ) {
            flowbiteElements.push(element);
          }
        }
      }
    }

    // add an attribute to the element to indicate that it has been initialized
    for (let i = 0; i < flowbiteElements.length; i++) {
      const element = flowbiteElements[i];
      element.setAttribute('flowbite-initialized', '');
    }
    initFlowbite();

    flowbiteElements.forEach((element) => {
      const attributes: { name: string; value: string }[] = Array.from(
        element.attributes,
      );
      const dataAttributes = attributes.filter((attribute) =>
        attribute.name.startsWith('data-'),
      );

      dataAttributes.forEach((attribute) => {
        element.setAttribute(
          attribute.name.replace('data-', 'fb-'),
          attribute.value,
        );
        element.removeAttribute(attribute.name);
      });
    });
  });
};
