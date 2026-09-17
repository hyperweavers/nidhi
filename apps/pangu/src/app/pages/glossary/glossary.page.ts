import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GLOSSARY_TERMS } from '../../data/glossary-data';

@Component({
  selector: 'app-glossary',
  imports: [FormsModule],
  templateUrl: './glossary.page.html',
  styleUrl: './glossary.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlossaryPage {
  protected readonly searchQuery = signal('');
  protected readonly expandedTerm = signal<string | null>(null);

  protected readonly filteredTerms = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const matches = q
      ? GLOSSARY_TERMS.filter(
          (item) =>
            item.term.toLowerCase().includes(q) ||
            item.definition.toLowerCase().includes(q),
        )
      : GLOSSARY_TERMS;
    // Alphabetical by default; no manual sort option.
    return [...matches].sort((a, b) => a.term.localeCompare(b.term));
  });

  protected onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.expandedTerm.set(null);
  }

  protected toggleTerm(term: string): void {
    this.expandedTerm.set(this.expandedTerm() === term ? null : term);
  }

  protected isExpanded(term: string): boolean {
    return this.expandedTerm() === term;
  }
}
