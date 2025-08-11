import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeletePage } from './delete.page';

describe('DeletePage', () => {
  let component: DeletePage;
  let fixture: ComponentFixture<DeletePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeletePage],
    }).compileComponents();

    fixture = TestBed.createComponent(DeletePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
