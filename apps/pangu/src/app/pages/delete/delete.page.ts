import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BasePage } from '../base.page';

@Component({
  selector: 'app-delete-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete.page.html',
  styleUrl: './delete.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletePage extends BasePage {}
