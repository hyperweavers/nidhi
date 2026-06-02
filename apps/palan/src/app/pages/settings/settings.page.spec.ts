import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RefreshInterval, Theme } from '../../models/settings';
import { SettingsService } from '../../services/core/settings.service';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let mockSettingsService: {
    settings$: import('rxjs').Observable<unknown>;
    setTheme: jest.Mock;
    setRefreshInterval: jest.Mock;
  };

  beforeEach(async () => {
    mockSettingsService = {
      settings$: of({
        theme: Theme.LIGHT,
        refreshInterval: RefreshInterval.THIRTY_SECONDS,
      }),
      setTheme: jest.fn(),
      setRefreshInterval: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [{ provide: SettingsService, useValue: mockSettingsService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('selectTheme', () => {
    it('should call settingsService.setTheme with the selected theme', () => {
      component.selectTheme(Theme.DARK);
      expect(mockSettingsService.setTheme).toHaveBeenCalledWith(Theme.DARK);
    });

    it('should call settingsService.setTheme with LIGHT theme', () => {
      component.selectTheme(Theme.LIGHT);
      expect(mockSettingsService.setTheme).toHaveBeenCalledWith(Theme.LIGHT);
    });
  });

  describe('selectRefreshInterval', () => {
    it('should call settingsService.setRefreshInterval with the selected interval', () => {
      component.selectRefreshInterval(RefreshInterval.THIRTY_SECONDS);
      expect(mockSettingsService.setRefreshInterval).toHaveBeenCalledWith(
        RefreshInterval.THIRTY_SECONDS,
      );
    });

    it('should call settingsService.setRefreshInterval with ONE_MINUTE', () => {
      component.selectRefreshInterval(RefreshInterval.ONE_MINUTE);
      expect(mockSettingsService.setRefreshInterval).toHaveBeenCalledWith(
        RefreshInterval.ONE_MINUTE,
      );
    });
  });
});
