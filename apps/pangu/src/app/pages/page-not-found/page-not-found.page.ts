import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-not-found-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-not-found.page.html',
  styleUrl: './page-not-found.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageNotFoundPage {}
