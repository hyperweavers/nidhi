import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GLOSSARY_TERMS } from '../../data/glossary-data';
import { GlossaryPage } from './glossary.page';

describe('GlossaryPage', () => {
  let component: GlossaryPage;
  let fixture: ComponentFixture<GlossaryPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlossaryPage],
    }).compileComponents();

    fixture = TestBed.createComponent(GlossaryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show all terms by default', () => {
    expect(component['searchQuery']()).toBe('');
    expect(component['filteredTerms']()).toHaveLength(GLOSSARY_TERMS.length);
  });

  it('should sort terms alphabetically by default', () => {
    const terms = component['filteredTerms']().map((item) => item.term);
    expect(terms[0]).toBe('52-Week High / Low');
    const sorted = [...terms].sort((a, b) => a.localeCompare(b));
    expect(terms).toEqual(sorted);
  });

  it('should filter by term text case-insensitively', () => {
    component['onSearchChange']('sebi');
    const filtered = component['filteredTerms']();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(GLOSSARY_TERMS.length);
    for (const item of filtered) {
      expect(`${item.term} ${item.definition}`.toLowerCase()).toContain('sebi');
    }
  });

  it('should filter by definition text and trim the query', () => {
    component['onSearchChange']('  demat  ');
    const filtered = component['filteredTerms']();
    expect(filtered.length).toBeGreaterThan(0);
    for (const item of filtered) {
      expect(`${item.term} ${item.definition}`.toLowerCase()).toContain(
        'demat',
      );
    }
  });

  it('should return no terms for an unmatched query', () => {
    component['onSearchChange']('zzz-no-such-term');
    expect(component['filteredTerms']()).toEqual([]);
  });

  it('should expand and collapse a term', () => {
    const term = GLOSSARY_TERMS[0].term;
    expect(component['isExpanded'](term)).toBe(false);
    component['toggleTerm'](term);
    expect(component['isExpanded'](term)).toBe(true);
    component['toggleTerm'](term);
    expect(component['isExpanded'](term)).toBe(false);
  });

  it('should collapse the expanded term when searching', () => {
    const term = GLOSSARY_TERMS[0].term;
    component['toggleTerm'](term);
    expect(component['isExpanded'](term)).toBe(true);
    component['onSearchChange']('ipo');
    expect(component['isExpanded'](term)).toBe(false);
  });

  it('should contain at least 150 unique non-empty terms', () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(150);
    const names = GLOSSARY_TERMS.map((item) => item.term);
    expect(new Set(names).size).toBe(names.length);
    for (const item of GLOSSARY_TERMS) {
      expect(item.term.trim().length).toBeGreaterThan(0);
      expect(item.definition.trim().length).toBeGreaterThan(0);
    }
  });
});
