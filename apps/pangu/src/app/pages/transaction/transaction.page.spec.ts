import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionPage } from './transaction.page';

describe('TransactionComponent', () => {
  let component: TransactionPage;
  let fixture: ComponentFixture<TransactionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionPage],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
