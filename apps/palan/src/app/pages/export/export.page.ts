
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  DOCUMENT
} from '@angular/core';
import { ExportProgress as Progress } from 'dexie-export-import';

import { StorageService } from '../../services/core/storage.service';

@Component({
  selector: 'app-export',
  imports: [],
  templateUrl: './export.page.html',
  styleUrl: './export.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportPage {
  public showStatusModal?: boolean;
  public showExportProgress?: boolean;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly cdr: ChangeDetectorRef,
    private readonly storageService: StorageService,
  ) {}

  public async export(): Promise<void> {
    this.showStatusModal = true;
    this.showExportProgress = true;

    this.cdr.markForCheck();

    const blob = await this.storageService.exportDb(
      this.progressCallback.bind(this),
    );

    const url = window.URL.createObjectURL(blob);
    const a = this.document.createElement('a');
    this.document.body.appendChild(a);
    a.setAttribute('style', 'display: none');
    a.href = url;
    a.download = 'palan-data.json';

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
