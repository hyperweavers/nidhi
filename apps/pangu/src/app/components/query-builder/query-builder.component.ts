import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject, debounceTime, switchMap } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { Constants } from '../../constants';
import {
  COMPANY_NAME_OPERATORS,
  COMPANY_NAME_PROPERTY,
  CompanyNameValue,
  QUERY_COMBINATORS,
  QUERY_OPERATORS,
  QueryChange,
  QueryCombinator,
  QueryConditionNode,
  QueryGroupNode,
  QueryNode,
  QueryOperator,
  buildDisplayQueryText,
  buildQueryText,
  filterProperties,
  isCompanyNameCondition,
  isPropertyOperand,
  isValidConditionValue,
  parseValueExpression,
  splitListValue,
} from '../../models/query-builder';
import { ScreenerService } from '../../services/screener.service';

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

@UntilDestroy()
@Component({
  selector: 'app-query-builder',
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './query-builder.component.html',
  styleUrl: './query-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueryBuilderComponent implements OnInit {
  private readonly screenerService = inject(ScreenerService);

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

  /** Portfolio/watch-list options for Company Name IN / NOT IN clauses. */
  public readonly companySources = signal<readonly CompanyNameValue[]>([]);
  /** Async company options for all Company Name clauses. */
  public readonly companySearchResults = signal<readonly CompanyNameValue[]>(
    [],
  );

  public readonly QUERY_OPERATORS = QUERY_OPERATORS;
  public readonly QUERY_COMBINATORS = QUERY_COMBINATORS;
  public readonly minSearchChars = Constants.configs.defaults.MIN_SEARCH_CHARS;

  public readonly liveQuery = computed(() =>
    buildQueryText(this.root(), this.properties()),
  );

  private readonly companySearchTerm$ = new Subject<string>();
  private closeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.screenerService.companyNameSources$
      .pipe(untilDestroyed(this))
      .subscribe((sources) => this.companySources.set(sources));

    this.companySearchTerm$
      .pipe(
        debounceTime(Constants.configs.defaults.SEARCH_DEBOUNCE_TIME),
        switchMap((term) => this.screenerService.searchCompanies(term)),
        untilDestroyed(this),
      )
      .subscribe((results) => this.companySearchResults.set(results));

    effect(() => {
      // Re-emit whenever the available properties change (validity may change).
      // Reads of root inside emitQuery stay untracked so user edits never
      // re-trigger this effect.
      this.properties();
      untracked(() => this.emitQuery());
    });

    effect(() => {
      // Applies the saved tree exactly when it arrives/changes. Everything
      // else stays untracked: without this, every root edit would re-run the
      // effect and reset the builder to the saved tree.
      const tree = this.initialTree();
      untracked(() => {
        if (tree) {
          this.root.set(cloneGroup(tree));
          this.emitQuery();
        }
      });
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

  /** Appends a condition to the end of a group (footer "Add new clause"). */
  public addConditionAfter(groupId: string, afterId: string | null): void {
    const node = emptyCondition();
    this.root.update((root) =>
      this.mapGroup(root, groupId, (g) => {
        if (!afterId) return { ...g, children: [...g.children, node] };
        const idx = g.children.findIndex((c) => c.id === afterId);
        if (idx < 0) return { ...g, children: [...g.children, node] };
        const children = [...g.children];
        children.splice(idx + 1, 0, node);
        return { ...g, children };
      }),
    );
    this.emitQuery();
  }

  public removeNode(nodeId: string): void {
    this.root.update((root) =>
      this.pruneEmptyGroups(this.filterNode(root, nodeId)),
    );
    this.emitQuery();
  }

  public setCombinator(groupId: string, combinator: QueryCombinator): void {
    this.root.update((root) =>
      this.mapGroup(root, groupId, (g) => ({ ...g, combinator })),
    );
    this.emitQuery();
  }

  /** Flattens a nested group back into its parent. */
  public ungroup(groupId: string): void {
    this.root.update((root) => this.ungroupNode(root, groupId));
    this.emitQuery();
  }

  private ungroupNode(node: QueryGroupNode, groupId: string): QueryGroupNode {
    const idx = node.children.findIndex(
      (c) => c.kind === 'group' && c.id === groupId,
    );
    if (idx >= 0) {
      const target = node.children[idx] as QueryGroupNode;
      const children = [...node.children];
      children.splice(idx, 1, ...target.children);
      return { ...node, children };
    }
    return {
      ...node,
      children: node.children.map((c) =>
        c.kind === 'group' ? this.ungroupNode(c, groupId) : c,
      ),
    };
  }

  public updateProperty(conditionId: string, value: string): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => this.withProperty(c, value)),
    );
    this.openPropertyFor.set(conditionId);
    this.emitQuery();
  }

  public selectProperty(conditionId: string, value: string): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => this.withProperty(c, value)),
    );
    this.openPropertyFor.set(null);
    this.emitQuery();
  }

  private withProperty(
    condition: QueryConditionNode,
    value: string,
  ): QueryConditionNode {
    const isCompany = value.trim() === COMPANY_NAME_PROPERTY;
    if (isCompany) {
      return {
        ...condition,
        property: value,
        operator: '=',
        value: '',
        companyNameValues: undefined,
      };
    }
    return {
      ...condition,
      property: value,
      companyNameValues: undefined,
    };
  }

  public updateOperator(conditionId: string, operator: QueryOperator): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => ({
        ...c,
        operator,
        value: '',
        companyNameValues: undefined,
      })),
    );
    this.chipDrafts.update((drafts) => {
      const next = { ...drafts };
      delete next[conditionId];
      return next;
    });
    this.companySearchResults.set([]);
    this.emitQuery();
  }

  public updateValue(conditionId: string, value: string): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) =>
        isCompanyNameCondition(c)
          ? { ...c, value, companyNameValues: undefined }
          : { ...c, value },
      ),
    );
    this.openValueFor.set(conditionId);
    this.emitQuery();
  }

  public isCompanyName(condition: QueryConditionNode): boolean {
    return isCompanyNameCondition(condition);
  }

  public operatorOptions(condition: QueryConditionNode): QueryOperator[] {
    return isCompanyNameCondition(condition)
      ? COMPANY_NAME_OPERATORS
      : QUERY_OPERATORS;
  }

  /** Company typeahead input: keeps typed text friendly until a result is picked. */
  public onCompanyNameInput(conditionId: string, value: string): void {
    this.updateValue(conditionId, value);
    this.companySearchTerm$.next(value);
    if (value.trim().length >= this.minSearchChars) {
      this.openValue(conditionId);
    } else {
      this.companySearchResults.set([]);
    }
  }

  /**
   * Company typeahead for the IN / NOT IN chip input. The draft is only a
   * search filter here; values are added when an option is picked.
   */
  public onCompanyChipInput(conditionId: string, value: string): void {
    this.setChipDraft(conditionId, value);
    this.companySearchTerm$.next(value);
    if (value.trim().length >= this.minSearchChars) {
      this.openValue(conditionId);
    } else {
      this.companySearchResults.set([]);
    }
  }

  public selectCompany(conditionId: string, option: CompanyNameValue): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => ({
        ...c,
        value: option.label,
        companyNameValues: [option],
      })),
    );
    this.companySearchResults.set([]);
    this.openValueFor.set(null);
    this.emitQuery();
  }

  public companySourceSuggestions(search: string): CompanyNameValue[] {
    const q = search.trim().toLowerCase();
    return this.companySources()
      .filter((source) => !q || source.label.toLowerCase().includes(q))
      .slice(0, 50);
  }

  /**
   * Adds a selected company, portfolio, or watch list as a value chip.
   * ETM primary IDs are normalized and later deduplicated by the serializer.
   */
  public addCompanyNameValue(
    conditionId: string,
    option: CompanyNameValue,
  ): void {
    this.root.update((root) =>
      this.mapCondition(root, conditionId, (c) => {
        if (!isCompanyNameCondition(c)) return c;
        const normalized: CompanyNameValue = {
          label: option.label.trim(),
          entityIds: [
            ...new Set(
              option.entityIds.filter((entityId) => !!entityId.trim()),
            ),
          ],
        };
        if (!normalized.label || normalized.entityIds.length === 0) return c;
        const existingValues = c.companyNameValues ?? [];
        if (
          existingValues.some(
            (value) => value.label.trim() === normalized.label,
          )
        ) {
          return c;
        }
        const values = [...existingValues, normalized];
        return {
          ...c,
          value: values.map((value) => value.label).join(', '),
          companyNameValues: values,
        };
      }),
    );
    this.chipDrafts.update((drafts) => ({ ...drafts, [conditionId]: '' }));
    this.companySearchResults.set([]);
    this.openValueFor.set(null);
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
    const condition = this.findCondition(conditionId);
    if (condition && isCompanyNameCondition(condition)) {
      // Draft text is only a search filter here; options are picked from a list.
      this.chipDrafts.update((drafts) => ({ ...drafts, [conditionId]: draft }));
      this.openValueFor.set(conditionId);
      return;
    }
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
    const condition = this.findCondition(conditionId);
    if (condition && isCompanyNameCondition(condition)) {
      // Free text is never a valid company/source value.
      this.chipDrafts.update((drafts) => ({ ...drafts, [conditionId]: '' }));
      this.openValueFor.set(null);
      return;
    }
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
        // Otherwise the draft is only the search text used to filter the
        // suggestions, so the picked option replaces it (never both).
        const trailingOp = draft.match(/^(.+?)\s*[+\-*/]\s*$/);
        const additions = trailingOp?.[1]?.trim()
          ? [`${trailingOp[1].trim()} ${draft.trim().slice(-1)} ${option}`]
          : [option];
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
        const values = isCompanyNameCondition(c)
          ? (c.companyNameValues ?? []).filter((_, i) => i !== index)
          : c.companyNameValues;
        return {
          ...c,
          value: existing.join(', '),
          companyNameValues: values?.length ? values : undefined,
        };
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
    this.companySearchResults.set([]);
  }

  public propertySuggestions(search: string): string[] {
    return filterProperties(this.properties(), search);
  }

  public valueSuggestions(search: string): string[] {
    // For expressions like "Amount +", suggest based on the text after
    // the last arithmetic operator so the dropdown stays useful.
    const tail = search.split(/[+\-*/]/).pop() ?? search;
    return filterProperties(this.properties(), tail).filter(
      (property) => property !== COMPANY_NAME_PROPERTY,
    );
  }

  public isPropertyValid(property: string): boolean {
    return isPropertyOperand(property, this.properties());
  }

  public isValueValid(
    value: string,
    operator: QueryOperator,
    companyNameValues?: readonly CompanyNameValue[],
  ): boolean {
    return isValidConditionValue(
      value,
      operator,
      this.properties(),
      companyNameValues,
    );
  }

  public chipItemValid(item: string): boolean {
    return parseValueExpression(item, this.properties()).valid;
  }

  public trackById(_index: number, node: QueryNode): string {
    return node.id;
  }

  // -- private tree helpers ---------------------------------------------------

  private emitQuery(): void {
    const tree = this.root();
    const properties = this.properties();
    const built = buildQueryText(tree, properties);
    this.queryChange.emit({
      query: built.query,
      displayQuery: buildDisplayQueryText(tree, properties),
      isValid: built.isValid,
    });
  }

  private findCondition(conditionId: string): QueryConditionNode | undefined {
    const visit = (node: QueryNode): QueryConditionNode | undefined => {
      if (node.kind === 'condition') {
        return node.id === conditionId ? node : undefined;
      }
      for (const child of node.children) {
        const found = visit(child);
        if (found) return found;
      }
      return undefined;
    };
    return visit(this.root());
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

  /**
   * Drops nested groups left childless by a removal (bottom-up, so chains of
   * emptied groups collapse too). The root itself is always kept.
   */
  private pruneEmptyGroups(node: QueryGroupNode): QueryGroupNode {
    return {
      ...node,
      children: node.children
        .map((child) =>
          child.kind === 'group' ? this.pruneEmptyGroups(child) : child,
        )
        .filter((child) => child.kind !== 'group' || child.children.length > 0),
    };
  }
}
