import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportProgress as Progress } from 'dexie-export-import';

import { StorageService } from '../../services/core/storage.service';

@Component({
  selector: 'app-import-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import.page.html',
  styleUrl: './import.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportPage {
  @ViewChild('importFileInput', { static: true })
  private importFileInput?: ElementRef;

  public statusMessage?: string;
  public showStatusModal?: boolean;
  public showImportProgress?: boolean;

  private importFile: File | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private storageService: StorageService
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public handleFileInput(event: any) {
    this.importFile = event.target.files.item(0);
  }

  public async import(): Promise<void> {
    if (this.importFile) {
      this.statusMessage = '';
      this.showStatusModal = true;
      this.showImportProgress = true;

      this.cdr.markForCheck();

      await this.storageService.importDb(
        this.importFile,
        this.progressCallback.bind(this)
      );
    } else {
      this.statusMessage = 'Please select a file to import!';
      this.showStatusModal = true;
    }
  }

  public closeStatusModal(): void {
    this.showStatusModal = false;
  }

  private progressCallback(progress: Progress): boolean {
    if (progress.done) {
      this.statusMessage = 'Data imported successfully!';
      this.showImportProgress = false;

      this.importFile = null;

      if (this.importFileInput) {
        this.importFileInput.nativeElement.value = '';
      }
    }

    this.cdr.markForCheck();

    return true;
  }
}
