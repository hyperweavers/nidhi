import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';

import { LOGGER } from '@nidhi/shared-logger';

import { StorageService } from '../../services/core/storage.service';

@Component({
  selector: 'app-delete',
  imports: [],
  templateUrl: './delete.page.html',
  styleUrl: './delete.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletePage {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly storageService = inject(StorageService);
  private readonly logger = inject(LOGGER);

  public statusMessage?: string;
  public showStatusModal?: boolean;
  public showDeleteProgress?: boolean;

  public async delete(): Promise<void> {
    this.statusMessage = '';
    this.showStatusModal = true;
    this.showDeleteProgress = true;

    this.cdr.markForCheck();

    try {
      await this.storageService.deleteDb();
    } catch (error) {
      this.logger.captureException(error);

      this.statusMessage = 'Failed to delete data. Please try again.';
      this.showDeleteProgress = false;
    }

    this.statusMessage = 'Data deleted successfully!';
    this.showDeleteProgress = false;

    this.cdr.markForCheck();
  }

  public closeStatusAlert(): void {
    this.showStatusModal = false;
  }
}
