import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportPage } from './import.page';

describe('ImportPage', () => {
  let component: ImportPage;
  let fixture: ComponentFixture<ImportPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
