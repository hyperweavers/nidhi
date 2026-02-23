import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-page-not-found',
  imports: [],
  templateUrl: './page-not-found.page.html',
  styleUrl: './page-not-found.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageNotFoundPage {}
