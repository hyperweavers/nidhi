import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisclaimerPage } from './disclaimer.page';

describe('DisclaimerPage', () => {
  let component: DisclaimerPage;
  let fixture: ComponentFixture<DisclaimerPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisclaimerPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DisclaimerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
