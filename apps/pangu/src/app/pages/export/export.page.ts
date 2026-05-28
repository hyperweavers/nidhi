import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DOCUMENT,
  inject,
} from '@angular/core';
import { ExportProgress as Progress } from 'dexie-export-import';

import { LOGGER } from '@nidhi/shared-logger';

import { StorageService } from '../../services/core/storage.service';

@Component({
  selector: 'app-export',
  imports: [],
  templateUrl: './export.page.html',
  styleUrl: './export.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportPage {
  private readonly document = inject<Document>(DOCUMENT);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly storageService = inject(StorageService);
  private readonly logger = inject(LOGGER);

  public statusMessage?: string;
  public showStatusModal?: boolean;
  public showExportProgress?: boolean;

  public async export(): Promise<void> {
    this.showStatusModal = true;
    this.showExportProgress = true;

    this.cdr.markForCheck();

    try {
      const blob = await this.storageService.exportDb(
        this.progressCallback.bind(this),
      );

      const url = window.URL.createObjectURL(blob);
      const a = this.document.createElement('a');
      this.document.body.appendChild(a);
      a.setAttribute('style', 'display: none');
      a.href = url;
      a.download = 'pangu-data.json';

      a.click();

      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      this.logger.captureException(error);

      this.statusMessage = 'Failed to export data. Please try again.';
      this.showExportProgress = false;
    }

    this.cdr.markForCheck();
  }

  public closeStatusModal(): void {
    this.showStatusModal = false;
  }

  private progressCallback(progress: Progress): boolean {
    if (progress.done) {
      this.statusMessage = 'Data exported successfully!';
      this.showExportProgress = false;
    }

    this.cdr.markForCheck();

    return true;
  }
}
