import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '@nidhi/shared-toast';
import { BehaviorSubject } from 'rxjs';

import { ScreenerService } from '../../services/screener.service';
import { ScreenersPage } from './screeners.page';

describe('ScreenersPage', () => {
  let component: ScreenersPage;
  let fixture: ComponentFixture<ScreenersPage>;

  const screeners$ = new BehaviorSubject([
    {
      id: '1',
      name: 'Alpha',
      query: 'Q1',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: '2',
      name: 'Beta',
      query: 'Q2',
      createdAt: 2,
      updatedAt: 2,
    },
  ]);
  const deleteScreener = jest.fn(() => Promise.resolve());
  const setFavorite = jest.fn(() => Promise.resolve());
  const toastShow = jest.fn();
  const routerNavigate = jest.fn();

  beforeEach(async () => {
    deleteScreener.mockClear();
    setFavorite.mockClear();
    toastShow.mockClear();
    routerNavigate.mockClear();

    await TestBed.configureTestingModule({
      imports: [ScreenersPage],
      providers: [
        {
          provide: ScreenerService,
          useValue: { screeners$, deleteScreener, setFavorite },
        },
        { provide: ToastService, useValue: { show: toastShow } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.screeners().length).toBe(2);
  });

  it('should filter by search', () => {
    component.searchQuery.set('alpha');
    expect(component.filteredScreeners().map((s) => s.name)).toEqual(['Alpha']);
  });

  it('should sort', () => {
    component.setSort(
      component.ScreenersSortType.CREATED_AT,
      component.ScreenersSortOrder.DSC,
    );
    expect(component.filteredScreeners()[0].name).toBe('Beta');
  });

  it('should navigate to screener on row click', () => {
    component.openScreener({
      id: '1',
      name: 'Alpha',
      query: 'Q',
      createdAt: 0,
      updatedAt: 0,
    });
    expect(routerNavigate).toHaveBeenCalledWith(['/', 'screener', '1']);
  });

  it('should navigate to edit', () => {
    component.editScreener({
      id: '1',
      name: 'Alpha',
      query: 'Q',
      createdAt: 0,
      updatedAt: 0,
    });
    expect(routerNavigate).toHaveBeenCalledWith(['/', 'screener', 'edit', '1']);
  });

  it('should add new', () => {
    component.addNew();
    expect(routerNavigate).toHaveBeenCalledWith(['/', 'screener', 'edit']);
  });

  it('should delete with confirmation', async () => {
    component.openDeleteConfirm({
      id: '1',
      name: 'Alpha',
      query: 'Q',
      createdAt: 0,
      updatedAt: 0,
    });
    expect(component.showDeleteConfirm()).toBe(true);
    await component.confirmDelete();
    expect(deleteScreener).toHaveBeenCalledWith('1');
    expect(component.showDeleteConfirm()).toBe(false);
  });

  it('should show error toast when delete fails', async () => {
    deleteScreener.mockRejectedValueOnce(new Error('db fail'));
    component.openDeleteConfirm({
      id: '1',
      name: 'Alpha',
      query: 'Q',
      createdAt: 0,
      updatedAt: 0,
    });
    await component.confirmDelete();
    expect(toastShow).toHaveBeenCalled();
    expect(component.showDeleteConfirm()).toBe(false);
  });

  it('should restore sort and search from query params', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ScreenersPage],
      providers: [
        {
          provide: ScreenerService,
          useValue: { screeners$, deleteScreener, setFavorite },
        },
        { provide: ToastService, useValue: { show: toastShow } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (k: string) => {
                  if (k === 'sortBy') return 'created_at';
                  if (k === 'sortOrder') return 'dsc';
                  if (k === 'search') return 'Alpha';
                  return null;
                },
              },
            },
          },
        },
      ],
    }).compileComponents();
    const f2 = TestBed.createComponent(ScreenersPage);
    f2.detectChanges();
    expect(f2.componentInstance.sortBy()).toBe('created_at');
    expect(f2.componentInstance.searchQuery()).toBe('Alpha');
  });

  it('should clear filters', () => {
    component.searchQuery.set('x');
    component.clearFiltersAndSort();
    expect(component.searchQuery()).toBe('');
  });

  it('should sort favorites first', () => {
    screeners$.next([
      { id: '1', name: 'Alpha', query: 'Q1', createdAt: 1, updatedAt: 1 },
      {
        id: '2',
        name: 'Beta',
        query: 'Q2',
        createdAt: 2,
        updatedAt: 2,
        isFavorite: true,
      },
    ]);
    expect(component.filteredScreeners().map((s) => s.name)).toEqual([
      'Beta',
      'Alpha',
    ]);
    screeners$.next([
      { id: '1', name: 'Alpha', query: 'Q1', createdAt: 1, updatedAt: 1 },
      { id: '2', name: 'Beta', query: 'Q2', createdAt: 2, updatedAt: 2 },
    ]);
  });

  it('should toggle favorite', async () => {
    await component.toggleFavorite({
      id: '1',
      name: 'Alpha',
      query: 'Q',
      createdAt: 0,
      updatedAt: 0,
    });
    expect(setFavorite).toHaveBeenCalledWith('1', true);
  });

  it('should show error toast when favorite toggle fails', async () => {
    setFavorite.mockRejectedValueOnce(new Error('db fail'));
    await component.toggleFavorite({
      id: '1',
      name: 'Alpha',
      query: 'Q',
      createdAt: 0,
      updatedAt: 0,
    });
    expect(toastShow).toHaveBeenCalled();
  });

  it('should sort by updated_at in both orders', () => {
    screeners$.next([
      { id: '1', name: 'Alpha', query: 'Q1', createdAt: 1, updatedAt: 30 },
      { id: '2', name: 'Beta', query: 'Q2', createdAt: 2, updatedAt: 10 },
    ]);
    component.setSort(
      component.ScreenersSortType.UPDATED_AT,
      component.ScreenersSortOrder.ASC,
    );
    expect(component.filteredScreeners().map((s) => s.name)).toEqual([
      'Beta',
      'Alpha',
    ]);
    component.setSort(
      component.ScreenersSortType.UPDATED_AT,
      component.ScreenersSortOrder.DSC,
    );
    expect(component.filteredScreeners().map((s) => s.name)).toEqual([
      'Alpha',
      'Beta',
    ]);
    screeners$.next([
      { id: '1', name: 'Alpha', query: 'Q1', createdAt: 1, updatedAt: 1 },
      { id: '2', name: 'Beta', query: 'Q2', createdAt: 2, updatedAt: 2 },
    ]);
  });

  it('should keep favorites on top regardless of sort', () => {
    screeners$.next([
      { id: '1', name: 'Alpha', query: 'Q1', createdAt: 1, updatedAt: 30 },
      {
        id: '2',
        name: 'Beta',
        query: 'Q2',
        createdAt: 2,
        updatedAt: 10,
        isFavorite: true,
      },
    ]);
    for (const type of [
      component.ScreenersSortType.NAME,
      component.ScreenersSortType.CREATED_AT,
      component.ScreenersSortType.UPDATED_AT,
    ]) {
      for (const order of [
        component.ScreenersSortOrder.ASC,
        component.ScreenersSortOrder.DSC,
      ]) {
        component.setSort(type, order);
        expect(component.filteredScreeners()[0].name).toBe('Beta');
      }
    }
    screeners$.next([
      { id: '1', name: 'Alpha', query: 'Q1', createdAt: 1, updatedAt: 1 },
      { id: '2', name: 'Beta', query: 'Q2', createdAt: 2, updatedAt: 2 },
    ]);
  });

  it('should sync sort to query params', () => {
    component.setSort(
      component.ScreenersSortType.UPDATED_AT,
      component.ScreenersSortOrder.DSC,
    );
    expect(routerNavigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { sortBy: 'updated_at', sortOrder: 'dsc' },
      }),
    );
  });

  it('should restore updated_at sort from query params', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ScreenersPage],
      providers: [
        {
          provide: ScreenerService,
          useValue: { screeners$, deleteScreener, setFavorite },
        },
        { provide: ToastService, useValue: { show: toastShow } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (k: string) => {
                  if (k === 'sortBy') return 'updated_at';
                  if (k === 'sortOrder') return 'asc';
                  return null;
                },
              },
            },
          },
        },
      ],
    }).compileComponents();
    const f2 = TestBed.createComponent(ScreenersPage);
    f2.detectChanges();
    expect(f2.componentInstance.sortBy()).toBe('updated_at');
    expect(f2.componentInstance.sortOrder()).toBe('asc');
  });

  it('should format created and updated dates like the ipo calendar', () => {
    expect(component.formatDate(Date.UTC(2026, 7, 15, 12))).toBe('15 Aug 2026');
    expect(component.formatDate(0)).toBe('--');
    expect(component.formatDate(undefined)).toBe('--');
  });

  it('should render sort control and date cells', () => {
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.css('#screenersSortDropdownButton')),
    ).toBeTruthy();
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);
    expect(rows[0].nativeElement.textContent).toContain('1 Jan 1970');
  });
});
