import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LOGGER } from '@nidhi/shared-logger';

import { StorageService } from '../../services/core/storage.service';
import { ImportPage } from './import.page';

describe('ImportPage', () => {
  let component: ImportPage;
  let fixture: ComponentFixture<ImportPage>;
  let mockStorageService: jest.Mocked<Pick<StorageService, 'importDb'>>;
  let mockLogger: jest.Mocked<typeof LOGGER>;

  beforeEach(async () => {
    mockStorageService = { importDb: jest.fn() };
    mockLogger = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [ImportPage],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show status modal with error when importing without a file', () => {
    jest.spyOn(component as any, 'progressCallback');

    component.import();

    expect(component.statusMessage).toBe('Please select a file to import!');
    expect(component.showStatusModal).toBe(true);
  });

  it('should handle file input', () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    const event = { target: { files: { item: jest.fn().mockReturnValue(file) } } };

    component.handleFileInput(event);

    expect(event.target.files.item).toHaveBeenCalledWith(0);
  });

  it('should import successfully and show success message', async () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    component['importFile'] = file;
    mockStorageService.importDb.mockResolvedValue(undefined);

    await component.import();

    expect(mockStorageService.importDb).toHaveBeenCalledWith(
      file,
      expect.any(Function),
    );
    expect(component.showStatusModal).toBe(true);
  });

  it('should handle import error gracefully', async () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    component['importFile'] = file;
    const testError = new Error('Import failed');
    mockStorageService.importDb.mockRejectedValue(testError);

    await component.import();

    expect(mockLogger.captureException).toHaveBeenCalledWith(testError);
    expect(component.statusMessage).toBe('Failed to import data. Please try again.');
    expect(component.showImportProgress).toBe(false);
  });

  it('should close status modal', () => {
    component.showStatusModal = true;

    component.closeStatusModal();

    expect(component.showStatusModal).toBe(false);
  });

  it('should clear import file on successful progress done', () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    component['importFile'] = file;

    const result = component['progressCallback']({ done: true } as any);

    expect(result).toBe(true);
    expect(component['importFile']).toBeNull();
    expect(component.statusMessage).toBe('Data imported successfully!');
    expect(component.showImportProgress).toBe(false);
  });

  it('should not clear import file on progress not done', () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    component['importFile'] = file;

    const result = component['progressCallback']({ done: false } as any);

    expect(result).toBe(true);
    expect(component['importFile']).toBe(file);
  });

  it('should show status modal and progress on import start', async () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    component['importFile'] = file;
    mockStorageService.importDb.mockImplementation(async () => {
      expect(component.showStatusModal).toBe(true);
      expect(component.showImportProgress).toBe(true);
    });

    await component.import();

    expect(component.showStatusModal).toBe(true);
  });

  it('should enable the import button', () => {
    const importBtn = fixture.debugElement.query(By.css('button[type="button"]'));
    expect(importBtn.nativeElement.textContent.trim()).toBe('Import');
  });

  it('should show warning alert', () => {
    const alert = fixture.debugElement.query(By.css('[role="alert"]'));
    expect(alert).toBeTruthy();
    expect(alert.nativeElement.textContent).toContain('Warning');
  });

  it('should have file input', () => {
    const fileInput = fixture.debugElement.query(By.css('input[type="file"]'));
    expect(fileInput).toBeTruthy();
  });

  it('should reset file input ref on import error when ref exists', async () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    component['importFile'] = file;
    const testError = new Error('Import failed');
    mockStorageService.importDb.mockRejectedValue(testError);
    const mockNativeElement = { value: 'test.json' };
    (component as any)['importFileInputRef'] = () => ({ nativeElement: mockNativeElement });

    await component.import();

    expect(mockNativeElement.value).toBe('');
  });

  it('should reset file input ref on progress done when ref exists', () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    component['importFile'] = file;
    const mockNativeElement = { value: 'test.json' };
    (component as any)['importFileInputRef'] = () => ({ nativeElement: mockNativeElement });

    const result = component['progressCallback']({ done: true } as any);

    expect(result).toBe(true);
    expect(mockNativeElement.value).toBe('');
  });
});
