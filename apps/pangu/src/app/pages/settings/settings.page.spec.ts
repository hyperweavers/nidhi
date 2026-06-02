import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RefreshInterval, Theme } from '../../models/settings';
import { SettingsService } from '../../services/core/settings.service';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let settingsService: jest.Mocked<
    Pick<SettingsService, 'settings$' | 'setTheme' | 'setRefreshInterval'>
  >;

  beforeEach(async () => {
    settingsService = {
      settings$: of({} as any),
      setTheme: jest.fn(),
      setRefreshInterval: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [{ provide: SettingsService, useValue: settingsService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select theme', () => {
    component.selectTheme(Theme.LIGHT);
    expect(settingsService.setTheme).toHaveBeenCalledWith(Theme.LIGHT);
  });

  it('should select refresh interval', () => {
    component.selectRefreshInterval(RefreshInterval.ONE_MINUTE);
    expect(settingsService.setRefreshInterval).toHaveBeenCalledWith(
      RefreshInterval.ONE_MINUTE,
    );
  });

  it('should expose Theme and RefreshInterval enums', () => {
    expect(component.Theme).toBe(Theme);
    expect(component.RefreshInterval).toBe(RefreshInterval);
  });
});
