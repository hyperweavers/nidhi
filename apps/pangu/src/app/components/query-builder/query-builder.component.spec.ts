import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueryBuilderComponent } from './query-builder.component';

const PROPS = ['Amount', 'Expected amount', 'Fiscal year'];

describe('QueryBuilderComponent', () => {
  let component: QueryBuilderComponent;
  let fixture: ComponentFixture<QueryBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryBuilderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QueryBuilderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('properties', PROPS);
    fixture.detectChanges();
  });

  function firstConditionId(): string {
    const child = component.root().children[0];
    if (!child || child.kind !== 'condition') throw new Error('no condition');
    return child.id;
  }

  function completeFirstCondition(): string {
    const id = firstConditionId();
    component.selectProperty(id, 'Amount');
    component.updateOperator(id, '>');
    component.updateValue(id, '25,500');
    fixture.detectChanges();
    return id;
  }

  it('should create with one empty condition', () => {
    expect(component).toBeTruthy();
    expect(component.root().children).toHaveLength(1);
  });

  it('should emit invalid empty query initially', () => {
    expect(component.liveQuery()).toEqual({ query: '', isValid: false });
  });

  it('should emit a text query once the condition is complete', () => {
    const emitted: { query: string; isValid: boolean }[] = [];
    component.queryChange.subscribe((q) => emitted.push(q));

    completeFirstCondition();

    expect(emitted.at(-1)).toEqual({ query: 'Amount > 25500', isValid: true });
  });

  it('should rewrite != as NOT ... =', () => {
    const id = firstConditionId();
    component.selectProperty(id, 'Amount');
    component.updateOperator(id, '!=');
    component.updateValue(id, '500');

    expect(component.liveQuery()).toEqual({
      query: 'NOT Amount = 500',
      isValid: true,
    });
  });

  it('should add and remove conditions', () => {
    const rootId = component.root().id;
    component.addCondition(rootId);
    expect(component.root().children).toHaveLength(2);

    const id = firstConditionId();
    component.removeNode(id);
    expect(component.root().children).toHaveLength(1);
  });

  it('should add nested groups and join with parens', () => {
    completeFirstCondition();
    component.addInnerGroup(component.root().id);

    const nested = component.root().children[1];
    expect(nested?.kind).toBe('group');
    if (nested?.kind !== 'group') throw new Error('no nested group');

    const nestedId = nested.children[0];
    if (!nestedId || nestedId.kind !== 'condition')
      throw new Error('no nested condition');
    component.selectProperty(nestedId.id, 'Fiscal year');
    component.updateOperator(nestedId.id, '=');
    component.updateValue(nestedId.id, '175000');
    component.setCombinator(nested.id, 'OR');

    expect(component.liveQuery()).toEqual({
      query: 'Amount > 25500 AND (Fiscal year = 175000)',
      isValid: true,
    });

    component.removeNode(nested.id);
    expect(component.root().children).toHaveLength(1);
  });

  it('should serialize IN lists from chips', () => {
    const id = firstConditionId();
    component.selectProperty(id, 'Amount');
    component.updateOperator(id, 'IN');
    component.setChipDraft(id, '10,');
    component.setChipDraft(id, '20');
    component.commitChipDraft(id);

    expect(component.liveQuery()).toEqual({
      query: 'Amount IN (10, 20)',
      isValid: true,
    });

    component.removeChip(id, 0);
    expect(component.liveQuery()).toEqual({
      query: 'Amount IN (20)',
      isValid: true,
    });

    component.removeChip(id, 0);
    expect(component.liveQuery()).toEqual({ query: '', isValid: false });
  });

  it('should add a chip directly from a property option', () => {
    const id = firstConditionId();
    component.selectProperty(id, 'Amount');
    component.updateOperator(id, 'IN');
    component.addChipFromOption(id, 'Expected amount');

    expect(component.liveQuery()).toEqual({
      query: 'Amount IN (Expected amount)',
      isValid: true,
    });
  });

  it('should replace the typed search text when picking a chip option', () => {
    const id = firstConditionId();
    component.selectProperty(id, 'Amount');
    component.updateOperator(id, 'IN');
    component.setChipDraft(id, 'Expected');
    component.addChipFromOption(id, 'Expected amount');

    expect(component.liveQuery()).toEqual({
      query: 'Amount IN (Expected amount)',
      isValid: true,
    });
    expect(component.chipDraft(id)).toBe('');
  });

  it('should reorder children on drop', () => {
    const rootId = component.root().id;
    component.addCondition(rootId);
    const ids = component.root().children.map((c) => c.id);

    component.onDrop({ previousIndex: 0, currentIndex: 1 } as never, rootId);

    expect(component.root().children.map((c) => c.id)).toEqual([
      ids[1],
      ids[0],
    ]);
  });

  it('should ignore drops without movement', () => {
    const rootId = component.root().id;
    const before = component.root();
    component.onDrop({ previousIndex: 0, currentIndex: 0 } as never, rootId);
    expect(component.root()).toEqual(before);
  });

  it('should complete a trailing arithmetic operator from a value option', () => {
    const id = completeFirstCondition();
    component.updateValue(id, 'Amount +');
    component.selectValueOption(id, 'Expected amount');

    expect(component.liveQuery()).toEqual({
      query: 'Amount > Amount + Expected amount',
      isValid: true,
    });
  });

  it('should filter suggestions offline', () => {
    expect(component.propertySuggestions('')).toHaveLength(3);
    expect(component.propertySuggestions('expected')).toEqual([
      'Expected amount',
    ]);
    expect(component.valueSuggestions('Amount + exp')).toEqual([
      'Expected amount',
    ]);
  });

  it('should validate properties and values', () => {
    expect(component.isPropertyValid('Amount')).toBe(true);
    expect(component.isPropertyValid('Unknown')).toBe(false);
    expect(component.isValueValid('500', '=')).toBe(true);
    expect(component.isValueValid('nope', '=')).toBe(false);
    expect(component.chipItemValid('10')).toBe(true);
    expect(component.chipItemValid('nope')).toBe(false);
  });

  it('should open dropdowns and close them after a delay', () => {
    jest.useFakeTimers();
    try {
      const id = firstConditionId();
      component.openProperty(id);
      expect(component.openPropertyFor()).toBe(id);
      component.openValue(id);
      expect(component.openValueFor()).toBe(id);
      component.scheduleClose();
      jest.advanceTimersByTime(200);
      expect(component.openPropertyFor()).toBeNull();
      expect(component.openValueFor()).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('should keep the property dropdown open while typing', () => {
    const id = firstConditionId();
    component.updateProperty(id, 'Amo');
    expect(component.openPropertyFor()).toBe(id);
    expect(component.propertySuggestions('Amo')).toContain('Amount');
    expect(component.liveQuery().isValid).toBe(false);
  });

  it('should replace the value when picking an option without trailing operator', () => {
    const id = firstConditionId();
    component.selectProperty(id, 'Amount');
    component.updateOperator(id, '=');
    component.updateValue(id, 'Am');
    component.selectValueOption(id, 'Amount');
    expect(component.liveQuery()).toEqual({
      query: 'Amount = Amount',
      isValid: true,
    });
  });

  it('should expose chips and drafts', () => {
    const id = firstConditionId();
    expect(component.chipsFor(id, '10, 20')).toEqual(['10', '20']);
    expect(component.chipDraft(id)).toBe('');
    component.setChipDraft(id, '4');
    expect(component.chipDraft(id)).toBe('4');
  });

  it('should ignore empty chip drafts', () => {
    const id = firstConditionId();
    component.setChipDraft(id, ',');
    expect(component.chipDraft(id)).toBe('');
    component.commitChipDraft(id);
    expect(component.liveQuery()).toEqual({ query: '', isValid: false });
  });

  it('should complete trailing-operator chip drafts from options', () => {
    const id = firstConditionId();
    component.selectProperty(id, 'Amount');
    component.updateOperator(id, 'IN');
    component.setChipDraft(id, 'Amount +');
    component.addChipFromOption(id, 'Expected amount');
    expect(component.liveQuery()).toEqual({
      query: 'Amount IN (Amount + Expected amount)',
      isValid: true,
    });
  });

  it('should tolerate out-of-range drops', () => {
    const rootId = component.root().id;
    const before = component.root().children.map((c) => c.id);
    component.onDrop({ previousIndex: 9, currentIndex: 0 } as never, rootId);
    expect(component.root().children.map((c) => c.id)).toEqual(before);
  });

  it('should reset the close timer when rescheduled', () => {
    jest.useFakeTimers();
    try {
      const id = firstConditionId();
      component.openProperty(id);
      component.scheduleClose();
      component.scheduleClose();
      jest.advanceTimersByTime(100);
      expect(component.openPropertyFor()).toBe(id);
      jest.advanceTimersByTime(100);
      expect(component.openPropertyFor()).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('should re-emit when properties change', () => {
    const emitted: { query: string; isValid: boolean }[] = [];
    component.queryChange.subscribe((q) => emitted.push(q));
    completeFirstCondition();
    const count = emitted.length;
    fixture.componentRef.setInput('properties', [...PROPS, 'New prop']);
    fixture.detectChanges();
    expect(emitted.length).toBeGreaterThan(count);
    expect(emitted.at(-1)).toEqual({
      query: 'Amount > 25500',
      isValid: true,
    });
  });
  it('should close dropdowns synchronously', () => {
    const id = firstConditionId();
    component.openProperty(id);
    expect(component.openPropertyFor()).toBe(id);
    component.closeDropdowns();
    expect(component.openPropertyFor()).toBeNull();
    expect(component.openValueFor()).toBeNull();
  });

  it('should track nodes by id', () => {
    const node = component.root().children[0];
    if (!node) throw new Error('missing node');
    expect(component.trackById(0, node)).toBe(node.id);
  });

  it('should keep user edits after the initial tree loads', () => {
    TestBed.resetTestingModule();
    return (async () => {
      await TestBed.configureTestingModule({
        imports: [QueryBuilderComponent],
      }).compileComponents();
      const f2 = TestBed.createComponent(QueryBuilderComponent);
      f2.componentRef.setInput('properties', PROPS);
      f2.componentRef.setInput('initialTree', {
        kind: 'group',
        id: 'g1',
        combinator: 'AND',
        children: [
          {
            kind: 'condition',
            id: 'c1',
            property: 'Amount',
            operator: '>',
            value: '10',
          },
        ],
      });
      f2.detectChanges();
      await f2.whenStable();
      const emitted: { query: string; isValid: boolean }[] = [];
      f2.componentInstance.queryChange.subscribe((q) => emitted.push(q));

      f2.componentInstance.updateValue('c1', '99');
      f2.detectChanges();
      await f2.whenStable();

      const child = f2.componentInstance.root().children[0];
      expect(child).toMatchObject({ property: 'Amount', value: '99' });
      expect(emitted.at(-1)).toEqual({
        query: 'Amount > 99',
        isValid: true,
      });
    })();
  });

  it('should insert a clause below a given row', () => {
    const rootId = component.root().id;
    const firstId = firstConditionId();
    component.addConditionAfter(rootId, firstId);
    expect(component.root().children).toHaveLength(2);
    expect(component.root().children[0]?.id).toBe(firstId);
  });

  it('should append when inserting without a known target row', () => {
    const rootId = component.root().id;
    component.addConditionAfter(rootId, null);
    expect(component.root().children).toHaveLength(2);
    component.addConditionAfter(rootId, 'missing-id');
    expect(component.root().children).toHaveLength(3);
  });

  it('should ignore chip commits without a draft', () => {
    const id = firstConditionId();
    expect(component.chipDraft(id)).toBe('');
    component.commitChipDraft(id);
    expect(component.root().children).toHaveLength(1);
    expect(component.liveQuery()).toEqual({ query: '', isValid: false });
  });

  it('should flatten a nested group with ungroup', () => {
    const rootId = component.root().id;
    component.addInnerGroup(rootId);
    expect(component.root().children).toHaveLength(2);
    const nested = component.root().children[1];
    expect(nested?.kind).toBe('group');
    if (nested?.kind !== 'group') throw new Error('no nested group');

    component.ungroup(nested.id);
    expect(component.root().children).toHaveLength(2);
    expect(component.root().children.every((c) => c.kind === 'condition')).toBe(
      true,
    );
  });

  it('should ungroup a doubly nested group', () => {
    const rootId = component.root().id;
    component.addInnerGroup(rootId);
    const nested = component.root().children[1];
    if (nested?.kind !== 'group') throw new Error('no nested group');
    component.addInnerGroup(nested.id);
    const inner = component.root().children[1];
    if (inner?.kind !== 'group') throw new Error('no nested group');
    const deep = inner.children[1];
    if (deep?.kind !== 'group') throw new Error('no deep group');

    component.ungroup(deep.id);
    const after = component.root().children[1];
    if (after?.kind !== 'group') throw new Error('no nested group');
    expect(after.children.every((c) => c.kind === 'condition')).toBe(true);
  });

  it('should delete the group when its last clause is removed', () => {
    const rootId = component.root().id;
    component.addInnerGroup(rootId);
    const nested = component.root().children[1];
    expect(nested?.kind).toBe('group');
    if (nested?.kind !== 'group') throw new Error('no nested group');
    const clause = nested.children[0];
    if (!clause || clause.kind !== 'condition')
      throw new Error('no nested clause');

    component.removeNode(clause.id);
    expect(component.root().children).toHaveLength(1);
    expect(component.root().children[0]?.kind).toBe('condition');
  });

  it('should keep an emptied root group', () => {
    const id = firstConditionId();
    component.removeNode(id);
    expect(component.root().children).toHaveLength(0);
  });

  it('should set the group combinator from any row', () => {
    const rootId = component.root().id;
    component.addCondition(rootId);
    component.setCombinator(rootId, 'OR');
    expect(component.root().combinator).toBe('OR');
  });

  it('should clone nested initial tree', () => {
    TestBed.resetTestingModule();
    return (async () => {
      await TestBed.configureTestingModule({
        imports: [QueryBuilderComponent],
      }).compileComponents();
      const f2 = TestBed.createComponent(QueryBuilderComponent);
      f2.componentRef.setInput('properties', PROPS);
      f2.componentRef.setInput('initialTree', {
        kind: 'group',
        id: 'g1',
        combinator: 'OR',
        children: [
          {
            kind: 'group',
            id: 'g2',
            combinator: 'AND',
            children: [
              {
                kind: 'condition',
                id: 'c1',
                property: 'Amount',
                operator: '>',
                value: '10',
              },
            ],
          },
          {
            kind: 'condition',
            id: 'c2',
            property: 'Amount',
            operator: '<',
            value: '20',
          },
        ],
      });
      f2.detectChanges();
      await f2.whenStable();
      const root = f2.componentInstance.root();
      expect(root.children).toHaveLength(2);
      expect(root.children[0]?.kind).toBe('group');
    })();
  });
});
