import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StorageService } from '../../services/core/storage.service';
import { ExportPage } from './export.page';

describe('ExportPage', () => {
  let component: ExportPage;
  let fixture: ComponentFixture<ExportPage>;
  let mockStorageService: { exportDb: jest.Mock };

  beforeEach(async () => {
    const mockBlob = new Blob(['test'], { type: 'application/json' });
    mockStorageService = {
      exportDb: jest.fn().mockResolvedValue(mockBlob),
    };

    await TestBed.configureTestingModule({
      imports: [ExportPage],
      providers: [{ provide: StorageService, useValue: mockStorageService }],
    })
      .overrideComponent(ExportPage, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ExportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should export database and trigger download', async () => {
    const mockUrl = 'blob:test';
    const createObjectURLSpy = jest.fn().mockReturnValue(mockUrl);
    const revokeObjectURLSpy = jest.fn();
    const origURL = window.URL;
    Object.defineProperty(window, 'URL', {
      value: {
        ...origURL,
        createObjectURL: createObjectURLSpy,
        revokeObjectURL: revokeObjectURLSpy,
      },
      writable: true,
      configurable: true,
    });

    await component.export();

    expect(mockStorageService.exportDb).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(component.showStatusModal).toBe(true);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockUrl);

    Object.defineProperty(window, 'URL', {
      value: origURL,
      writable: true,
      configurable: true,
    });
  });

  it('should close status modal', () => {
    component.showStatusModal = true;
    component.closeStatusModal();
    expect(component.showStatusModal).toBe(false);
  });

  it('progressCallback should mark done and return true', () => {
    component.showExportProgress = true;
    const result = (component as any).progressCallback({ done: true });
    expect(component.showExportProgress).toBe(false);
    expect(result).toBe(true);
  });

  it('progressCallback should not set showExportProgress to false if not done', () => {
    component.showExportProgress = true;
    const result = (component as any).progressCallback({ done: false });
    expect(component.showExportProgress).toBe(true);
    expect(result).toBe(true);
  });
});
