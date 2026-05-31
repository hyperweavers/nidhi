import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LOGGER } from '@nidhi/shared-logger';

import { StorageService } from '../../services/core/storage.service';
import { DeletePage } from './delete.page';

describe('DeletePage', () => {
  let component: DeletePage;
  let fixture: ComponentFixture<DeletePage>;
  let mockStorageService: jest.Mocked<Pick<StorageService, 'deleteDb'>>;
  let mockLogger: jest.Mocked<typeof LOGGER>;

  beforeEach(async () => {
    mockStorageService = { deleteDb: jest.fn() };
    mockLogger = {
      captureException: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [DeletePage],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeletePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should delete data successfully', async () => {
    mockStorageService.deleteDb.mockResolvedValue(undefined);

    await component.delete();

    expect(mockStorageService.deleteDb).toHaveBeenCalledTimes(1);
    expect(component.statusMessage).toBe('Data deleted successfully!');
    expect(component.showDeleteProgress).toBe(false);
    expect(component.showStatusModal).toBe(true);
  });

  it('should handle delete error but always show success message', async () => {
    const testError = new Error('Delete failed');
    mockStorageService.deleteDb.mockRejectedValue(testError);

    await component.delete();

    expect(mockLogger.captureException).toHaveBeenCalledWith(testError);
    expect(component.statusMessage).toBe('Data deleted successfully!');
    expect(component.showDeleteProgress).toBe(false);
    expect(component.showStatusModal).toBe(true);
  });

  it('should close status alert', () => {
    component.showStatusModal = true;

    component.closeStatusAlert();

    expect(component.showStatusModal).toBe(false);
  });

  it('should show modal and delete progress on delete start', async () => {
    mockStorageService.deleteDb.mockImplementation(async () => {
      expect(component.showStatusModal).toBe(true);
      expect(component.showDeleteProgress).toBe(true);
    });

    await component.delete();
  });

  it('should reset statusMessage before delete', async () => {
    component.statusMessage = 'old message';

    await component.delete();

    expect(component.statusMessage).toBe('Data deleted successfully!');
  });

  it('should render danger alert', () => {
    const alert = fixture.debugElement.query(By.css('[role="alert"]'));
    expect(alert).toBeTruthy();
    expect(alert.nativeElement.textContent).toContain('Danger');
  });

  it('should render Delete button', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const deleteBtn = buttons.find(b => b.nativeElement.textContent.trim() === 'Delete');
    expect(deleteBtn).toBeTruthy();
  });

  it('should show delete progress spinner in DOM during delete', async () => {
    mockStorageService.deleteDb.mockImplementation(async () => {
      fixture.detectChanges();
      const statusSection = fixture.debugElement.query(By.css('[class*="bg-opacity"]'));
      expect(statusSection.nativeElement.textContent).toContain('Deleting...');
    });

    await component.delete();
  });

  it('should show status message in DOM when delete completes', async () => {
    mockStorageService.deleteDb.mockResolvedValue(undefined);

    await component.delete();
    fixture.detectChanges();

    const statusSection = fixture.debugElement.query(By.css('[class*="bg-opacity"]'));
    expect(statusSection.nativeElement.textContent).toContain('Data deleted successfully!');
    expect(statusSection.nativeElement.textContent).toContain('Ok');
  });

  it('should show confirmation modal with Yes/No buttons', () => {
    const yesBtn = fixture.debugElement.queryAll(By.css('button')).find(
      b => b.nativeElement.textContent.trim() === "Yes, I'm sure",
    );
    const noBtn = fixture.debugElement.queryAll(By.css('button')).find(
      b => b.nativeElement.textContent.trim() === 'No, cancel',
    );

    expect(yesBtn).toBeTruthy();
    expect(noBtn).toBeTruthy();
  });
});
