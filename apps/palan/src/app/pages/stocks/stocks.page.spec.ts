import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StocksPage } from './stocks.page';

describe('StocksPage', () => {
  let component: StocksPage;
  let fixture: ComponentFixture<StocksPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StocksPage],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(StocksPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
