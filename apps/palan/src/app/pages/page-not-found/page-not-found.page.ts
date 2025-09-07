import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-page-not-found',
  imports: [CommonModule],
  templateUrl: './page-not-found.page.html',
  styleUrl: './page-not-found.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageNotFoundPage {}
