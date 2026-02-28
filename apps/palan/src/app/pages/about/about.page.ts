import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-about',
  imports: [],
  templateUrl: './about.page.html',
  styleUrl: './about.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {}
