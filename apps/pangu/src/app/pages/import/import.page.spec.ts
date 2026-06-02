import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';

import { StorageService } from '../../services/core/storage.service';
import { ImportPage } from './import.page';

describe('ImportPage', () => {
  let component: ImportPage;
  let fixture: ComponentFixture<ImportPage>;
  let storageService: jest.Mocked<Pick<StorageService, 'importDb'>>;
  let logger: { captureException: jest.Mock };

  beforeEach(async () => {
    storageService = { importDb: jest.fn() };
    logger = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ImportPage],
      providers: [
        { provide: LOGGER, useValue: logger },
        { provide: StorageService, useValue: storageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle file input event', () => {
    const file = new File(['data'], 'test.json', { type: 'application/json' });
    const event = { target: { files: { item: () => file } } };

    component.handleFileInput(event);

    expect(component['importFile']).toBe(file);
  });

  it('should import file successfully', async () => {
    const file = new File(['data'], 'test.json', { type: 'application/json' });
    component['importFile'] = file;
    storageService.importDb.mockImplementation(
      async (_file: File, cb: (p: { done: boolean }) => boolean) => {
        cb({ done: true });
      },
    );

    await component.import();

    expect(storageService.importDb).toHaveBeenCalledWith(
      file,
      expect.any(Function),
    );
    expect(component.showStatusModal).toBe(true);
    expect(component.showImportProgress).toBe(false);
    expect(component.statusMessage).toBe('Data imported successfully!');
  });

  it('should handle import error and log it', async () => {
    const file = new File(['data'], 'test.json', { type: 'application/json' });
    component['importFile'] = file;
    const error = new Error('Import failed');
    storageService.importDb.mockRejectedValue(error);

    await component.import();

    expect(logger.captureException).toHaveBeenCalledWith(error);
    expect(component.statusMessage).toBe(
      'Failed to import data. Please try again.',
    );
    expect(component.showImportProgress).toBe(false);
    expect(component['importFile']).toBeNull();
  });

  it('should show message when no file is selected', async () => {
    component['importFile'] = null;

    await component.import();

    expect(component.statusMessage).toBe('Please select a file to import!');
    expect(component.showStatusModal).toBe(true);
    expect(storageService.importDb).not.toHaveBeenCalled();
  });

  it('should update state on progress callback done', () => {
    component['importFile'] = new File(['data'], 'test.json');
    const result = (component as any).progressCallback({ done: true });

    expect(result).toBe(true);
    expect(component['importFile']).toBeNull();
    expect(component.statusMessage).toBe('Data imported successfully!');
    expect(component.showImportProgress).toBe(false);
  });

  it('should not update state on progress callback not done', () => {
    component['importFile'] = new File(['data'], 'test.json');
    component.statusMessage = '';
    const result = (component as any).progressCallback({ done: false });

    expect(result).toBe(true);
    expect(component['importFile']).toBeTruthy();
    expect(component.statusMessage).toBe('');
  });

  it('should close status modal', () => {
    component.showStatusModal = true;
    component.closeStatusModal();
    expect(component.showStatusModal).toBe(false);
  });
});
