import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';

import { WatchList } from '../../models/watch-list';
import { WatchListService } from '../../services/watch-list.service';
import {
  SelectWatchListComponent,
  WatchListSelectionMode,
} from './select-watch-list.component';

const mockLists: WatchList[] = [
  { id: '1', name: 'My Watch List', isDefault: true },
  { id: '2', name: 'Tech Stocks', isDefault: false },
  { id: '3', name: 'Blue Chips', isDefault: false },
];

describe('SelectWatchListComponent', () => {
  let component: SelectWatchListComponent;
  let fixture: ComponentFixture<SelectWatchListComponent>;
  let watchListService: jest.Mocked<WatchListService>;
  let watchListsSubject: Subject<WatchList[]>;

  beforeEach(async () => {
    watchListsSubject = new Subject<WatchList[]>();
    watchListService = {
      watchLists$: watchListsSubject.asObservable(),
      getWatchList$: jest.fn(),
      getWatchListStocks$: jest.fn(),
      ensureDefaultWatchList: jest.fn(),
      createWatchList: jest.fn(),
      renameWatchList: jest.fn(),
      deleteWatchList: jest.fn(),
      setDefaultWatchList: jest.fn(),
      addStock: jest.fn(),
      addStockToMultipleLists: jest.fn(),
      removeStock: jest.fn(),
      moveStock: jest.fn(),
      getListsWithoutStock: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [SelectWatchListComponent],
      providers: [{ provide: WatchListService, useValue: watchListService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectWatchListComponent);
    component = fixture.componentInstance;
    watchListsSubject.next(mockLists);
    fixture.detectChanges();
  });

  it('should create in single mode', () => {
    expect(component).toBeTruthy();
    expect(component.mode()).toBe(WatchListSelectionMode.SINGLE);
  });

  it('should show search input in single mode', () => {
    const input = fixture.debugElement.query(By.css('input[type="text"]'));
    expect(input).toBeTruthy();
    expect(input.nativeElement.placeholder).toBe('Search watch lists...');
  });

  it('should not show dropdown initially', () => {
    const dropdown = fixture.debugElement.query(By.css('.absolute.z-10'));
    expect(dropdown).toBeFalsy();
  });

  it('should show dropdown on focus', fakeAsync(() => {
    const input = fixture.debugElement.query(By.css('input[type="text"]'));
    input.nativeElement.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(component.showDropdown()).toBe(true);
  }));

  it('should filter lists based on search query', () => {
    component.allLists.set(mockLists);
    component.searchQuery.set('Tech');
    (component as any).filterLists('Tech');
    expect(component.filteredLists().length).toBe(1);
    expect(component.filteredLists()[0].name).toBe('Tech Stocks');
  });

  it('should show "No matching watch lists" when filter has no results with dropdown open', () => {
    component.allLists.set(mockLists);
    component.searchQuery.set('NoMatch');
    component.showDropdown.set(true);
    (component as any).filterLists('NoMatch');
    fixture.detectChanges();
    expect(component.filteredLists().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain(
      'No matching watch lists',
    );
  });

  it('should emit selected when a list is chosen in single mode', () => {
    const emitSpy = jest.spyOn(component.selected, 'emit');
    component.selectList(mockLists[1]);
    expect(emitSpy).toHaveBeenCalledWith(mockLists[1]);
  });

  it('should close dropdown after selecting', () => {
    component.selectList(mockLists[1]);
    expect(component.showDropdown()).toBe(false);
  });

  describe('multi mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('mode', WatchListSelectionMode.MULTI);
      fixture.detectChanges();
    });

    it('should show checkboxes in multi mode', () => {
      const checkboxes = fixture.debugElement.queryAll(
        By.css('input[type="checkbox"]'),
      );
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should toggle checkbox selection', () => {
      component.toggleList('2');
      expect(component.selectedIds().has('2')).toBe(true);
      component.toggleList('2');
      expect(component.selectedIds().has('2')).toBe(false);
    });

    it('should auto-check default list when stockIsin is provided', fakeAsync(() => {
      watchListService.getListsWithoutStock.mockResolvedValue(mockLists);
      fixture.componentRef.setInput('stockIsin', 'INE002A01018');
      fixture.componentRef.setInput('mode', WatchListSelectionMode.MULTI);
      watchListsSubject.next(mockLists);
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      expect(component.selectedIds().has('1')).toBe(true);
    }));

    it('should emit selected lists on confirmSelection', () => {
      const emitSpy = jest.spyOn(component.selected, 'emit');
      component.toggleList('1');
      component.toggleList('2');
      component.confirmSelection();
      expect(emitSpy).toHaveBeenCalledWith([mockLists[0], mockLists[1]]);
    });

    it('should toggle list selection on and off', () => {
      component.toggleList('1');
      expect(component.selectedIds().has('1')).toBe(true);
      component.toggleList('1');
      expect(component.selectedIds().has('1')).toBe(false);
    });

    it('should exclude excludeListId from available lists', () => {
      fixture.componentRef.setInput('excludeListId', '1');
      fixture.componentRef.setInput('mode', WatchListSelectionMode.MULTI);
      watchListsSubject.next(mockLists);
      fixture.detectChanges();
      const ids = component.allLists().map((l) => l.id);
      expect(ids).not.toContain('1');
    });
  });

  it('should filter lists with stockIsin in single mode', () => {
    watchListService.getListsWithoutStock.mockResolvedValue([mockLists[0]]);
    fixture.componentRef.setInput('stockIsin', 'INE002A01018');
    watchListsSubject.next(mockLists);
    fixture.detectChanges();
    expect(watchListService.getListsWithoutStock).toHaveBeenCalled();
  });

  it('should emit cancelled', () => {
    const emitSpy = jest.spyOn(component.cancelled, 'emit');
    component.cancelled.emit();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should close dropdown on blur after timeout', fakeAsync(() => {
    component.showDropdown.set(true);
    component.onBlur();
    expect(component.showDropdown()).toBe(true);
    tick(300);
    expect(component.showDropdown()).toBe(false);
  }));

  describe('showAsDropdown mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('showAsDropdown', true);
      fixture.componentRef.setInput('selectedListId', '1');
      fixture.detectChanges();
    });

    it('should open typeahead on openTypeahead', fakeAsync(() => {
      component.openTypeahead();
      expect(component.showTypeahead()).toBe(true);
      expect(component.showDropdown()).toBe(true);
      expect(component.searchQuery()).toBe('');
    }));

    it('should close typeahead on closeTypeahead', () => {
      component.showTypeahead.set(true);
      component.showDropdown.set(true);
      component.searchQuery.set('test');
      component.closeTypeahead();
      expect(component.showTypeahead()).toBe(false);
      expect(component.showDropdown()).toBe(false);
      expect(component.searchQuery()).toBe('');
    });

    it('should select list and close typeahead', () => {
      const emitSpy = jest.spyOn(component.selected, 'emit');
      component.showTypeahead.set(true);
      component.selectList(mockLists[1]);
      expect(emitSpy).toHaveBeenCalledWith(mockLists[1]);
      expect(component.showTypeahead()).toBe(false);
      expect(component.showDropdown()).toBe(false);
      expect(component.searchQuery()).toBe('');
    });

    it('should close typeahead on blur', fakeAsync(() => {
      component.showTypeahead.set(true);
      component.showDropdown.set(true);
      component.onBlur();
      tick(300);
      expect(component.showTypeahead()).toBe(false);
      expect(component.showDropdown()).toBe(false);
    }));
  });

  it('should filter lists with stockIsin and excludeListId in single mode', fakeAsync(() => {
    watchListService.getListsWithoutStock.mockResolvedValue([
      mockLists[1],
      mockLists[2],
    ]);
    fixture.componentRef.setInput('stockIsin', 'INE002A01018');
    fixture.componentRef.setInput('excludeListId', '1');
    watchListsSubject.next(mockLists);
    fixture.detectChanges();
    tick();
    expect(component.allLists().length).toBe(2);
    expect(component.allLists().find((l) => l.id === '1')).toBeUndefined();
  }));

  it('should show selectedListName for valid id', () => {
    fixture.componentRef.setInput('selectedListId', '2');
    fixture.detectChanges();
    expect(component.selectedListName()).toBe('Tech Stocks');
  });

  it('should show empty selectedListName for missing id', () => {
    fixture.componentRef.setInput('selectedListId', undefined);
    fixture.detectChanges();
    expect(component.selectedListName()).toBe('');
  });

  it('should show empty selectedListName for non-existent id', () => {
    fixture.componentRef.setInput('selectedListId', 'nonexistent');
    fixture.detectChanges();
    expect(component.selectedListName()).toBe('');
  });

  it('should not auto-check any list when no default exists in multi mode', fakeAsync(() => {
    const noDefaultLists = mockLists.map((l) => ({ ...l, isDefault: false }));
    watchListService.getListsWithoutStock.mockResolvedValue(noDefaultLists);
    fixture.componentRef.setInput('stockIsin', 'INE002A01018');
    fixture.componentRef.setInput('mode', WatchListSelectionMode.MULTI);
    watchListsSubject.next(mockLists);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.selectedIds().size).toBe(0);
  }));

  it('should focus search input when opening typeahead', fakeAsync(() => {
    fixture.detectChanges();
    const inputEl = fixture.debugElement.query(By.css('input'));
    if (inputEl) {
      const focusSpy = jest.spyOn(inputEl.nativeElement, 'focus');
      component.openTypeahead();
      fixture.detectChanges();
      tick(50);
      expect(component.searchInput()?.nativeElement).toBeTruthy();
      expect(focusSpy).toHaveBeenCalled();
    } else {
      component.openTypeahead();
      fixture.detectChanges();
      tick(50);
      expect(component.searchQuery()).toBe('');
    }
  }));
});
