import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';

import { ExportPage } from './export.page';
import { StorageService } from '../../services/core/storage.service';

describe('ExportPage', () => {
  let component: ExportPage;
  let fixture: ComponentFixture<ExportPage>;
  let storageService: jest.Mocked<Pick<StorageService, 'exportDb'>>;
  let logger: { captureException: jest.Mock };

  beforeEach(async () => {
    storageService = { exportDb: jest.fn() };
    logger = { captureException: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ExportPage],
      providers: [
        { provide: LOGGER, useValue: logger },
        { provide: StorageService, useValue: storageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should export successfully and trigger download', async () => {
    const blob = new Blob(['data'], { type: 'application/json' });
    storageService.exportDb.mockImplementation(async (callback: (p: { done: boolean }) => boolean) => {
      callback({ done: true });
      return blob;
    });

    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    (URL as any).createObjectURL = jest.fn().mockReturnValue('blob:dummy');
    (URL as any).revokeObjectURL = jest.fn();

    try {
      await component.export();

      expect(storageService.exportDb).toHaveBeenCalled();
      expect((URL as any).createObjectURL).toHaveBeenCalled();
      expect((URL as any).revokeObjectURL).toHaveBeenCalled();
      expect(component.statusMessage).toBe('Data exported successfully!');
      expect(component.showExportProgress).toBe(false);
    } finally {
      (URL as any).createObjectURL = origCreate;
      (URL as any).revokeObjectURL = origRevoke;
    }
  });

  it('should handle export error', async () => {
    const error = new Error('Export failed');
    storageService.exportDb.mockRejectedValue(error);

    await component.export();

    expect(logger.captureException).toHaveBeenCalledWith(error);
    expect(component.statusMessage).toBe('Failed to export data. Please try again.');
    expect(component.showExportProgress).toBe(false);
  });

  it('should update status on progress callback done', () => {
    const result = (component as any).progressCallback({ done: true });
    expect(result).toBe(true);
    expect(component.statusMessage).toBe('Data exported successfully!');
    expect(component.showExportProgress).toBe(false);
  });

  it('should close status modal', () => {
    component.showStatusModal = true;
    component.closeStatusModal();
    expect(component.showStatusModal).toBe(false);
  });
});
