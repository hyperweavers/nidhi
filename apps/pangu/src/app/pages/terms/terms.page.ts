import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-terms',
  imports: [CommonModule],
  templateUrl: './terms.page.html',
  styleUrl: './terms.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPage {}
