import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StorageService } from '../../services/core/storage.service';
import { DeletePage } from './delete.page';

describe('DeletePage', () => {
  let component: DeletePage;
  let fixture: ComponentFixture<DeletePage>;
  let mockStorageService: { deleteDb: jest.Mock };

  beforeEach(async () => {
    mockStorageService = { deleteDb: jest.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [DeletePage],
      providers: [{ provide: StorageService, useValue: mockStorageService }],
    })
      .overrideComponent(DeletePage, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DeletePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set showStatusModal and showDeleteProgress before deleting', async () => {
    await component.delete();
    expect(mockStorageService.deleteDb).toHaveBeenCalled();
    expect(component.showStatusModal).toBe(true);
    expect(component.showDeleteProgress).toBe(false);
  });

  it('should close status alert', () => {
    component.showStatusModal = true;
    component.closeStatusAlert();
    expect(component.showStatusModal).toBe(false);
  });
});
