import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportProgress as Progress } from 'dexie-export-import';

import { StorageService } from '../../services/core/storage.service';
import { BasePage } from '../base.page';

@Component({
  selector: 'app-export-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './export.page.html',
  styleUrl: './export.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportPage extends BasePage {
  public showStatusModal?: boolean;
  public showExportProgress?: boolean;

  constructor(
    private cdr: ChangeDetectorRef,
    private storageService: StorageService
  ) {
    super();
  }

  public async export(): Promise<void> {
    this.showStatusModal = true;
    this.showExportProgress = true;

    this.cdr.markForCheck();

    const blob = await this.storageService.exportDb(
      this.progressCallback.bind(this)
    );

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.setAttribute('style', 'display: none');
    a.href = url;
    a.download = 'pangu-data.json';

    a.click();

    window.URL.revokeObjectURL(url);
    a.remove();
  }

  public closeStatusModal(): void {
    this.showStatusModal = false;
  }

  private progressCallback(progress: Progress): boolean {
    if (progress.done) {
      this.showExportProgress = false;
    }

    this.cdr.markForCheck();

    return true;
  }
}
