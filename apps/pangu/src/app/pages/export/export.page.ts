import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BasePage } from '../base.page';

@Component({
  selector: 'app-export-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './export.page.html',
  styleUrl: './export.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportPage extends BasePage {}
