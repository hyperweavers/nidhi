import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Theme } from '../../models/settings';
import { SettingsService } from '../../services/core/settings.service';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let mockSettingsService: {
    settings$: ReturnType<typeof of>;
    setTheme: jest.Mock;
  };

  beforeEach(async () => {
    mockSettingsService = {
      settings$: of({ theme: Theme.DARK, colorScheme: 'dark' as const }),
      setTheme: jest.fn(),
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
    it('should call settingsService.setTheme with the provided theme', () => {
      component.selectTheme(Theme.DARK);
      expect(mockSettingsService.setTheme).toHaveBeenCalledWith(Theme.DARK);
    });

    it('should call settingsService.setTheme with LIGHT', () => {
      component.selectTheme(Theme.LIGHT);
      expect(mockSettingsService.setTheme).toHaveBeenCalledWith(Theme.LIGHT);
    });

    it('should call settingsService.setTheme with SYSTEM', () => {
      component.selectTheme(Theme.SYSTEM);
      expect(mockSettingsService.setTheme).toHaveBeenCalledWith(Theme.SYSTEM);
    });
  });
});
