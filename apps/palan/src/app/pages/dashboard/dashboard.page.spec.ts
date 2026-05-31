import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, Subject } from 'rxjs';

import { Direction } from '../../models/market';
import { Kpi, KpiCard } from '../../models/kpi';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let kpi$: Subject<Kpi>;

  const baseCards: KpiCard[] = [
    {
      id: 'portfolio.day',
      title: 'Portfolio',
      subtitle: 'Day',
      value: 50000,
      change: { direction: Direction.UP, value: 1000, percentage: 2.04 },
      routeLink: 'portfolio',
    },
  ];

  beforeEach(async () => {
    kpi$ = new Subject<Kpi>();

    await TestBed.configureTestingModule({
      imports: [DashboardPage, RouterTestingModule],
      providers: [
        { provide: DashboardService, useValue: { kpi$: kpi$.asObservable() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading spinner while kpi$ has not emitted', () => {
    expect(fixture.debugElement.query(By.css('[role="status"]'))).toBeTruthy();
  });

  it('should render KPI cards', () => {
    kpi$.next({ cards: baseCards });
    fixture.detectChanges();

    const cardTitles = fixture.debugElement.queryAll(By.css('h3'));
    expect(cardTitles.length).toBe(1);
    expect(cardTitles[0].nativeElement.textContent.trim()).toContain('Portfolio');
  });

  it('should format value with number pipe', () => {
    kpi$.next({
      cards: [
        { id: '1', title: 'T', value: 1234.5, change: { direction: Direction.UP, value: 10, percentage: 0.81 } },
      ],
    });
    fixture.detectChanges();

    const valueEl = fixture.debugElement.query(By.css('.text-2xl'));
    expect(valueEl.nativeElement.textContent.trim()).toBe('1,234.50');
  });

  it('should apply green class for UP direction', () => {
    kpi$.next({ cards: baseCards });
    fixture.detectChanges();

    const changePara = fixture.debugElement.query(By.css('p'));
    expect(changePara.nativeElement.classList).toContain('text-green-500');
  });

  it('should apply red class for DOWN direction', () => {
    const downCards: KpiCard[] = [
      {
        id: 'p.d',
        title: 'P',
        value: 100,
        change: { direction: Direction.DOWN, value: -50, percentage: -33.33 },
        routeLink: 'portfolio',
      },
    ];
    kpi$.next({ cards: downCards });
    fixture.detectChanges();

    const changePara = fixture.debugElement.query(By.css('p'));
    expect(changePara.nativeElement.classList).toContain('text-red-600');
  });

  it('should show nothing when cards array is empty', () => {
    kpi$.next({ cards: [] });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.grid'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[role="status"]'))).toBeNull();
  });

  it('should display subtitle when card has subtitle', () => {
    kpi$.next({ cards: baseCards });
    fixture.detectChanges();

    const subtitle = fixture.debugElement.query(By.css('span.text-xs'));
    expect(subtitle).toBeTruthy();
    expect(subtitle.nativeElement.textContent).toContain('Day');
  });

  it('should not show subtitle when card lacks subtitle', () => {
    kpi$.next({
      cards: [
        { id: '1', title: 'T', value: 100, change: { direction: Direction.UP, value: 1, percentage: 1 } },
      ],
    });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('span.text-xs'))).toBeNull();
  });

  it('should display change value and percentage', () => {
    kpi$.next({ cards: baseCards });
    fixture.detectChanges();

    const changeSpan = fixture.debugElement.query(By.css('p span'));
    expect(changeSpan.nativeElement.textContent).toContain('1,000.00');
    expect(changeSpan.nativeElement.textContent).toContain('2.04');
  });

  it('should expose Direction enum', () => {
    expect(component.Direction).toBe(Direction);
  });
});
