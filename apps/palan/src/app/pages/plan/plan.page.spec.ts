import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanPage } from './plan.page';

describe('PlanPage', () => {
  let component: PlanPage;
  let fixture: ComponentFixture<PlanPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
