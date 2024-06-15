import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BasePage } from '../base.page';

@Component({
  selector: 'app-transaction-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transaction.page.html',
  styleUrl: './transaction.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionPage extends BasePage {}
