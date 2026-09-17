import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AboutPage } from './about.page';

describe('AboutPage', () => {
  let component: AboutPage;
  let fixture: ComponentFixture<AboutPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose app version and routes', () => {
    expect(component['appVersion']).toBeDefined();
    expect(component['Routes']).toBeDefined();
  });
});
