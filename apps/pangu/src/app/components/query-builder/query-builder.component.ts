import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { v4 as uuid } from 'uuid';

import {
  QUERY_COMBINATORS,
  QUERY_OPERATORS,
  QueryChange,
  QueryCombinator,
  QueryConditionNode,
  QueryGroupNode,
  QueryNode,
  QueryOperator,
  buildQueryText,
  filterProperties,
  isPropertyOperand,
  isValidConditionValue,
  parseValueExpression,
  splitListValue,
} from '../../models/query-builder';

function emptyCondition(): QueryNode {
  return {
    kind: 'condition',
    id: uuid(),
    property: '',
    operator: '>',
    value: '',
  };
}

function emptyGroup(): QueryGroupNode {
  return { kind: 'group', id: uuid(), combinator: 'AND', children: [] };
}

function cloneGroup(group: QueryGroupNode): QueryGroupNode {
  return {
    ...group,
    children: group.children.map((child) =>
      child.kind === 'group' ? cloneGroup(child) : { ...child },
    ),
  };
}

@Component({
  selector: 'app-query-builder',
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './query-builder.component.html',
  styleUrl: './query-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueryBuilderComponent implements OnInit {
  /** Available properties. Used for offline typeahead in property + value fields. */
  public readonly properties = input<string[]>([]);
  public readonly initialTree = input<QueryGroupNode | null>(null);
  /** Emitted on any condition change with the text query and validity flag. */
  public readonly queryChange = output<QueryChange>();

  public readonly root = signal<QueryGroupNode>({
    kind: 'group',
    id: uuid(),
    combinator: 'AND',
    children: [emptyCondition()],
  });

  /** Condition id with an open property dropdown, if any. */
  public readonly openPropertyFor = signal<string | null>(null);
  /** Condition id with an open value dropdown, if any. */
  public readonly openValueFor = signal<string | null>(null);
  /** Draft text for the IN-list chip input, keyed by condition id. */
  public readonly chipDrafts = signal<Record<string, string>>({});

  public readonly QUERY_OPERATORS = QUERY_OPERATORS;
  public readonly QUERY_COMBINATORS = QUERY_COMBINATORS;

  public readonly liveQuery = computed(() =>
    buildQueryText(this.root(), this.properties()),
  );

  private closeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      // Re-emit whenever the available properties change (validity may change).
      this.properties();
      this.emitQuery();
    });

    effect(() => {
      const tree = this.initialTree();
      if (tree) {
        this.root.set(cloneGroup(tree));
        this.emitQuery();
      }
    });
  }

  public ngOnInit(): void {
    this.emitQuery();
  }

  // -- tree mutations (each emits) -----------------------------------------

  public addCondition(groupId: string): void {
    this.root.update((root) =>
      this.mapGroup(root, groupId, (g) => ({
        ...g,
        children: [...g.children, emptyCondition()],
      })),
    );
    this.emitQuery();
  }

  public addInnerGroup(groupId: string): void {
    const group = emptyGroup();
    group.children.push(emptyCondition());
    this.root.update((root) =>
      this.mapGroup(root, groupId, (g) => ({
        ...g,
        children: [...g.children, group],
      })),
    );
    this.emitQuery();
  }

  public removeNode(nodeId: string): void {
    this.root.update((root) => this.filterNode(root, nodeId));
    this.emitQuery();
  }

  public setCombinator(groupId: string, combinator: QueryCombinator): void {
    this.root.update((root) =>
      this.mapGroup(root, groupId, (g) => ({ ...g, combinator })),
    );
    this.emitQuery();
  }

  public updateProperty(conditionId: string, value: string): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => ({ ...c, property: value })),
    );
    this.openPropertyFor.set(conditionId);
    this.emitQuery();
  }

  public selectProperty(conditionId: string, value: string): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => ({ ...c, property: value })),
    );
    this.openPropertyFor.set(null);
    this.emitQuery();
  }

  public updateOperator(conditionId: string, operator: QueryOperator): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => ({
        ...c,
        operator,
        value: '',
      })),
    );
    this.chipDrafts.update((drafts) => {
      const next = { ...drafts };
      delete next[conditionId];
      return next;
    });
    this.emitQuery();
  }

  public updateValue(conditionId: string, value: string): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => ({ ...c, value })),
    );
    this.openValueFor.set(conditionId);
    this.emitQuery();
  }

  public selectValueOption(conditionId: string, option: string): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => {
        const current = c.value.trim();
        // If the user typed a trailing arithmetic operator, complete it.
        if (/[+\-*/]\s*$/.test(current)) {
          return { ...c, value: `${current} ${option}`.trim() };
        }
        return { ...c, value: option };
      }),
    );
    this.openValueFor.set(null);
    this.emitQuery();
  }

  public onDrop(event: CdkDragDrop<QueryNode[]>, groupId: string): void {
    const { previousIndex, currentIndex } = event;
    if (previousIndex === currentIndex) return;
    this.root.update((root) =>
      this.mapGroup(root, groupId, (g) => {
        const children = [...g.children];
        const [moved] = children.splice(previousIndex, 1);
        if (moved) children.splice(currentIndex, 0, moved);
        return { ...g, children };
      }),
    );
    this.emitQuery();
  }

  // -- IN-list chips --------------------------------------------------------

  public chipsFor(conditionId: string, value: string): string[] {
    void conditionId;
    return splitListValue(value);
  }

  public chipDraft(conditionId: string): string {
    return this.chipDrafts()[conditionId] ?? '';
  }

  public setChipDraft(conditionId: string, draft: string): void {
    if (draft.includes(',')) {
      const parts = draft
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parts.length > 0) {
        this.root.update((root) =>
          this.mapCondition(root, conditionId, (c) => {
            const existing = splitListValue(c.value);
            return { ...c, value: [...existing, ...parts].join(', ') };
          }),
        );
        this.emitQuery();
      }
      this.chipDrafts.update((drafts) => ({ ...drafts, [conditionId]: '' }));
      return;
    }
    this.chipDrafts.update((drafts) => ({ ...drafts, [conditionId]: draft }));
    this.openValueFor.set(conditionId);
  }

  public commitChipDraft(conditionId: string): void {
    const draft = (this.chipDrafts()[conditionId] ?? '').trim();
    if (!draft) return;
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => {
        const existing = splitListValue(c.value);
        return { ...c, value: [...existing, draft].join(', ') };
      }),
    );
    this.chipDrafts.update((drafts) => ({ ...drafts, [conditionId]: '' }));
    this.openValueFor.set(null);
    this.emitQuery();
  }

  public addChipFromOption(conditionId: string, option: string): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => {
        const existing = splitListValue(c.value);
        const draft = (this.chipDrafts()[conditionId] ?? '').trim();
        // Support "base +" draft awaiting a property operand.
        const trailingOp = draft.match(/^(.+?)\s*[+\-*/]\s*$/);
        const additions = trailingOp?.[1]?.trim()
          ? [`${trailingOp[1].trim()} ${draft.trim().slice(-1)} ${option}`]
          : [draft, option].filter((p) => p.trim().length > 0);
        return { ...c, value: [...existing, ...additions].join(', ') };
      }),
    );
    this.chipDrafts.update((drafts) => ({ ...drafts, [conditionId]: '' }));
    this.openValueFor.set(null);
    this.emitQuery();
  }

  public removeChip(conditionId: string, index: number): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => {
        const existing = splitListValue(c.value);
        existing.splice(index, 1);
        return { ...c, value: existing.join(', ') };
      }),
    );
    this.emitQuery();
  }

  // -- dropdown helpers ------------------------------------------------------

  public openProperty(id: string): void {
    this.clearCloseTimer();
    this.openPropertyFor.set(id);
    this.openValueFor.set(null);
  }

  public openValue(id: string): void {
    this.clearCloseTimer();
    this.openValueFor.set(id);
    this.openPropertyFor.set(null);
  }

  public scheduleClose(): void {
    this.clearCloseTimer();
    this.closeTimer = setTimeout(() => {
      this.closeDropdowns();
    }, 150);
  }

  /** Synchronously hides open dropdowns (used for empty-state taps). */
  public closeDropdowns(): void {
    this.clearCloseTimer();
    this.openPropertyFor.set(null);
    this.openValueFor.set(null);
  }

  public propertySuggestions(search: string): string[] {
    return filterProperties(this.properties(), search);
  }

  public valueSuggestions(search: string): string[] {
    // For expressions like "Amount +", suggest based on the text after
    // the last arithmetic operator so the dropdown stays useful.
    const tail = search.split(/[+\-*/]/).pop() ?? search;
    return filterProperties(this.properties(), tail);
  }

  public isPropertyValid(property: string): boolean {
    return isPropertyOperand(property, this.properties());
  }

  public isValueValid(value: string, operator: QueryOperator): boolean {
    return isValidConditionValue(value, operator, this.properties());
  }

  public chipItemValid(item: string): boolean {
    return parseValueExpression(item, this.properties()).valid;
  }

  public trackById(_index: number, node: QueryNode): string {
    return node.id;
  }

  // -- private tree helpers ---------------------------------------------------

  private emitQuery(): void {
    this.queryChange.emit(buildQueryText(this.root(), this.properties()));
  }

  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
    }
  }

  private mapGroup<T extends QueryNode>(
    node: T,
    groupId: string,
    update: (g: QueryGroupNode) => QueryGroupNode,
  ): T {
    if (node.kind !== 'group') return node;
    if (node.id === groupId) return update(node) as T;
    return {
      ...node,
      children: node.children.map((child) =>
        this.mapGroup(child, groupId, update),
      ),
    } as T;
  }

  private mapCondition<T extends QueryNode>(
    node: T,
    conditionId: string,
    update: (c: QueryConditionNode) => QueryConditionNode,
  ): T {
    if (node.kind === 'condition') {
      return (node.id === conditionId ? update(node) : node) as T;
    }
    return {
      ...node,
      children: node.children.map((child) =>
        this.mapCondition(child, conditionId, update),
      ),
    } as T;
  }

  private filterNode(node: QueryGroupNode, nodeId: string): QueryGroupNode {
    return {
      ...node,
      children: node.children
        .filter((child) => child.id !== nodeId)
        .map((child) =>
          child.kind === 'group' ? this.filterNode(child, nodeId) : child,
        ),
    };
  }
}
