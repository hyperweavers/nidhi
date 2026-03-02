import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ColorScheme, RefreshInterval, Theme } from '../../models/settings';
import { SettingsService } from '../../services/core/settings.service';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let mockSettingsService: {
    settings$: BehaviorSubject<any>;
    setTheme: jest.Mock;
    setRefreshInterval: jest.Mock;
  };

  beforeEach(async () => {
    mockSettingsService = {
      settings$: new BehaviorSubject({
        theme: Theme.SYSTEM,
        colorScheme: ColorScheme.LIGHT,
        refreshInterval: RefreshInterval.FIVE_SECONDS,
      }),
      setTheme: jest.fn(),
      setRefreshInterval: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [{ provide: SettingsService, useValue: mockSettingsService }],
    })
      .overrideComponent(SettingsPage, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have settings$ observable', (done) => {
    component.settings$.subscribe((settings) => {
      expect(settings.theme).toBe(Theme.SYSTEM);
      done();
    });
  });

  it('selectTheme should call settingsService.setTheme', () => {
    component.selectTheme(Theme.DARK);
    expect(mockSettingsService.setTheme).toHaveBeenCalledWith(Theme.DARK);
  });

  it('selectRefreshInterval should call settingsService.setRefreshInterval', () => {
    component.selectRefreshInterval(RefreshInterval.TEN_SECONDS);
    expect(mockSettingsService.setRefreshInterval).toHaveBeenCalledWith(
      RefreshInterval.TEN_SECONDS,
    );
  });

  it('should expose Theme and RefreshInterval enums', () => {
    expect(component.Theme).toBe(Theme);
    expect(component.RefreshInterval).toBe(RefreshInterval);
  });
});
