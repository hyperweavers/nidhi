import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-disclaimer',
  imports: [CommonModule],
  templateUrl: './disclaimer.page.html',
  styleUrl: './disclaimer.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisclaimerPage {}
