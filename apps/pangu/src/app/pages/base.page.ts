import { Component, AfterContentInit } from '@angular/core';
import { initFlowbite } from 'flowbite';

@Component({
  template: '',
})
export abstract class BasePage implements AfterContentInit {
  public ngAfterContentInit(): void {
    initFlowbite();
  }
}
