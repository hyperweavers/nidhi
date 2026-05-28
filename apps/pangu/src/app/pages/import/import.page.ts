import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { ExportProgress as Progress } from 'dexie-export-import';

import { LOGGER } from '@nidhi/shared-logger';

import { StorageService } from '../../services/core/storage.service';

@Component({
  selector: 'app-import',
  imports: [],
  templateUrl: './import.page.html',
  styleUrl: './import.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportPage {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly storageService = inject(StorageService);
  private readonly logger = inject(LOGGER);

  private readonly importFileInputRef =
    viewChild<ElementRef>('importFileInput');

  public statusMessage?: string;
  public showStatusModal?: boolean;
  public showImportProgress?: boolean;

  private importFile: File | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public handleFileInput(event: any) {
    this.importFile = event.target.files.item(0);
  }

  public async import(): Promise<void> {
    this.statusMessage = '';

    if (this.importFile) {
      this.showStatusModal = true;
      this.showImportProgress = true;

      this.cdr.markForCheck();

      try {
        await this.storageService.importDb(
          this.importFile,
          this.progressCallback.bind(this),
        );
      } catch (error) {
        this.logger.captureException(error);

        this.importFile = null;

        const importFileInputRef = this.importFileInputRef();
        if (importFileInputRef) {
          importFileInputRef.nativeElement.value = '';
        }

        this.statusMessage = 'Failed to import data. Please try again.';
        this.showImportProgress = false;
      }
    } else {
      this.statusMessage = 'Please select a file to import!';
      this.showStatusModal = true;
    }

    this.cdr.markForCheck();
  }

  public closeStatusModal(): void {
    this.showStatusModal = false;
  }

  private progressCallback(progress: Progress): boolean {
    if (progress.done) {
      this.importFile = null;

      const importFileInputRef = this.importFileInputRef();
      if (importFileInputRef) {
        importFileInputRef.nativeElement.value = '';
      }

      this.statusMessage = 'Data imported successfully!';
      this.showImportProgress = false;
    }

    this.cdr.markForCheck();

    return true;
  }
}
