import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LOGGER } from '@nidhi/shared-logger';

import { StorageService } from '../../services/core/storage.service';
import { ExportPage } from './export.page';

describe('ExportPage', () => {
  let component: ExportPage;
  let fixture: ComponentFixture<ExportPage>;
  let mockStorageService: jest.Mocked<Pick<StorageService, 'exportDb'>>;
  let mockLogger: jest.Mocked<typeof LOGGER>;

  beforeEach(async () => {
    mockStorageService = { exportDb: jest.fn() };
    mockLogger = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    } as any;

    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:http://localhost/fake');
    window.URL.revokeObjectURL = jest.fn();

    await TestBed.configureTestingModule({
      imports: [ExportPage],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should export and trigger file download', async () => {
    const blob = new Blob(['{"data":"test"}'], { type: 'application/json' });
    mockStorageService.exportDb.mockImplementation(async (callback: any) => {
      callback({ done: true });
      return blob;
    });

    const anchorMock = {
      setAttribute: jest.fn(),
      click: jest.fn(),
      remove: jest.fn(),
      href: '',
      download: '',
      style: {} as CSSStyleDeclaration,
    };
    jest.spyOn(document, 'createElement').mockReturnValue(anchorMock as any);
    jest.spyOn(document.body, 'appendChild').mockReturnValue(anchorMock as any);

    await component.export();

    expect(mockStorageService.exportDb).toHaveBeenCalledWith(expect.any(Function));
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchorMock.click).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake');
    expect(anchorMock.remove).toHaveBeenCalled();
    expect(component.showExportProgress).toBe(false);
    expect(component.showStatusModal).toBe(true);
  });

  it('should handle export error gracefully', async () => {
    const testError = new Error('Export failed');
    mockStorageService.exportDb.mockRejectedValue(testError);

    await component.export();

    expect(mockLogger.captureException).toHaveBeenCalledWith(testError);
    expect(component.statusMessage).toBe('Failed to export data. Please try again.');
    expect(component.showExportProgress).toBe(false);
  });

  it('should close status modal', () => {
    component.showStatusModal = true;

    component.closeStatusModal();

    expect(component.showStatusModal).toBe(false);
  });

  it('should set success message on progress complete', () => {
    const result = component['progressCallback']({ done: true } as any);

    expect(result).toBe(true);
    expect(component.statusMessage).toBe('Data exported successfully!');
    expect(component.showExportProgress).toBe(false);
  });

  it('should not set message on progress not done', () => {
    const result = component['progressCallback']({ done: false } as any);

    expect(result).toBe(true);
    expect(component.statusMessage).toBeUndefined();
  });

  it('should show modal and progress status on export start', async () => {
    mockStorageService.exportDb.mockImplementation(async () => {
      expect(component.showStatusModal).toBe(true);
      expect(component.showExportProgress).toBe(true);
    });

    await component.export();
  });

  it('should render export button', () => {
    const exportBtn = fixture.debugElement.query(By.css('button[type="button"]'));
    expect(exportBtn.nativeElement.textContent.trim()).toBe('Export');
  });

  it('should show export progress spinner in DOM during export', async () => {
    mockStorageService.exportDb.mockImplementation(async () => {
      fixture.detectChanges();
      const statusModal = fixture.debugElement.query(By.css('[class*="bg-opacity"]'));
      expect(statusModal.nativeElement.textContent).toContain('Exporting...');
      return new Blob();
    });

    const anchorMock = {
      setAttribute: jest.fn(),
      click: jest.fn(),
      remove: jest.fn(),
      href: '',
      download: '',
      style: {} as CSSStyleDeclaration,
    };
    jest.spyOn(document, 'createElement').mockReturnValue(anchorMock as any);
    jest.spyOn(document.body, 'appendChild').mockReturnValue(anchorMock as any);

    await component.export();
  });

  it('should show status message in DOM when export completes', async () => {
    mockStorageService.exportDb.mockImplementation(async (callback: any) => {
      callback({ done: true });
      return new Blob();
    });

    const anchorMock = {
      setAttribute: jest.fn(),
      click: jest.fn(),
      remove: jest.fn(),
      href: '',
      download: '',
      style: {} as CSSStyleDeclaration,
    };
    jest.spyOn(document, 'createElement').mockReturnValue(anchorMock as any);
    jest.spyOn(document.body, 'appendChild').mockReturnValue(anchorMock as any);

    await component.export();
    fixture.detectChanges();

    const statusModal = fixture.debugElement.query(By.css('[class*="bg-opacity"]'));
    expect(statusModal.nativeElement.textContent).toContain('Data exported successfully!');
    expect(statusModal.nativeElement.textContent).toContain('Ok');
  });

  it('should show Ok button on status modal when not exporting', () => {
    component.showStatusModal = true;
    component.showExportProgress = false;
    fixture.detectChanges();

    const statusModal = fixture.debugElement.query(By.css('[class*="bg-opacity"]'));
    const okBtn = statusModal?.query(By.css('button'));
    expect(okBtn?.nativeElement.textContent.trim()).toBe('Ok');
  });
});
