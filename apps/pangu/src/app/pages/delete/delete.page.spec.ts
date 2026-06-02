import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LOGGER } from '@nidhi/shared-logger';

import { StorageService } from '../../services/core/storage.service';
import { DeletePage } from './delete.page';

describe('DeletePage', () => {
  let component: DeletePage;
  let fixture: ComponentFixture<DeletePage>;
  let storageService: jest.Mocked<Pick<StorageService, 'deleteDb'>>;
  let logger: { captureException: jest.Mock };

  beforeEach(async () => {
    storageService = { deleteDb: jest.fn() };
    logger = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DeletePage],
      providers: [
        { provide: LOGGER, useValue: logger },
        { provide: StorageService, useValue: storageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeletePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should delete successfully and show success message', async () => {
    storageService.deleteDb.mockResolvedValue(undefined);

    await component.delete();

    expect(storageService.deleteDb).toHaveBeenCalled();
    expect(component.statusMessage).toBe('Data deleted successfully!');
    expect(component.showStatusModal).toBe(true);
    expect(component.showDeleteProgress).toBe(false);
  });

  it('should handle delete error and log it', async () => {
    const error = new Error('Delete failed');
    storageService.deleteDb.mockRejectedValue(error);

    await component.delete();

    expect(logger.captureException).toHaveBeenCalledWith(error);
    expect(component.showDeleteProgress).toBe(false);
  });

  it('should close status alert', () => {
    component.showStatusModal = true;
    component.closeStatusAlert();
    expect(component.showStatusModal).toBe(false);
  });
});
