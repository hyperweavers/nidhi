import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StorageService } from '../../services/core/storage.service';
import { ImportPage } from './import.page';

describe('ImportPage', () => {
  let component: ImportPage;
  let fixture: ComponentFixture<ImportPage>;
  let mockStorageService: { importDb: jest.Mock };

  beforeEach(async () => {
    mockStorageService = {
      importDb: jest.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ImportPage],
      providers: [{ provide: StorageService, useValue: mockStorageService }],
    })
      .overrideComponent(ImportPage, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ImportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('handleFileInput should set importFile', () => {
    const mockFile = new File(['test'], 'test.json', {
      type: 'application/json',
    });
    component.handleFileInput({ target: { files: { item: () => mockFile } } });
    expect((component as any).importFile).toBe(mockFile);
  });

  it('import should show error if no file selected', async () => {
    await component.import();
    expect(component.statusMessage).toBe('Please select a file to import!');
    expect(component.showStatusModal).toBe(true);
  });

  it('import should call importDb if file is selected', async () => {
    const mockFile = new File(['test'], 'test.json');
    component.handleFileInput({ target: { files: { item: () => mockFile } } });

    await component.import();

    expect(mockStorageService.importDb).toHaveBeenCalledWith(
      mockFile,
      expect.any(Function),
    );
    expect(component.showStatusModal).toBe(true);
    expect(component.showImportProgress).toBe(true);
  });

  it('closeStatusModal should set showStatusModal to false', () => {
    component.showStatusModal = true;
    component.closeStatusModal();
    expect(component.showStatusModal).toBe(false);
  });

  it('progressCallback with done=true should update status', () => {
    const result = (component as any).progressCallback({ done: true });
    expect(component.statusMessage).toBe('Data imported successfully!');
    expect(component.showImportProgress).toBe(false);
    expect((component as any).importFile).toBeNull();
    expect(result).toBe(true);
  });

  it('progressCallback with done=false should return true', () => {
    const result = (component as any).progressCallback({ done: false });
    expect(result).toBe(true);
  });

  it('progressCallback with done=true should reset file input if ref exists', () => {
    // Mock the viewChild signal
    const mockNativeElement = { value: 'something' };
    (component as any).importFileInputRef = () => ({
      nativeElement: mockNativeElement,
    });

    (component as any).progressCallback({ done: true });
    expect(mockNativeElement.value).toBe('');
  });
});
