import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio.page.html',
  styleUrl: './portfolio.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPage {}
