import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-privacy',
  imports: [CommonModule],
  templateUrl: './privacy.page.html',
  styleUrl: './privacy.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPage {}
