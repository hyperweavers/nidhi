import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BasePage } from '../base.page';

@Component({
  selector: 'app-terms-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms.page.html',
  styleUrl: './terms.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPage extends BasePage {}
