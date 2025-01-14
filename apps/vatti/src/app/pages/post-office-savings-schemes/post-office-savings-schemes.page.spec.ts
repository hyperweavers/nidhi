import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostOfficeSavingsSchemesPage } from './post-office-savings-schemes.page';

describe('PostOfficeSavingsSchemesPage', () => {
  let component: PostOfficeSavingsSchemesPage;
  let fixture: ComponentFixture<PostOfficeSavingsSchemesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostOfficeSavingsSchemesPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PostOfficeSavingsSchemesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
