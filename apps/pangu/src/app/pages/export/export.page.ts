import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
} from '@angular/core';
import { ExportProgress as Progress } from 'dexie-export-import';

import { StorageService } from '../../services/core/storage.service';

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './export.page.html',
  styleUrl: './export.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportPage {
  public showStatusModal?: boolean;
  public showExportProgress?: boolean;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
    private storageService: StorageService,
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
