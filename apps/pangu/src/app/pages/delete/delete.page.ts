
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';

import { StorageService } from '../../services/core/storage.service';

@Component({
  selector: 'app-delete',
  imports: [],
  templateUrl: './delete.page.html',
  styleUrl: './delete.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletePage {
  public showStatusModal?: boolean;
  public showDeleteProgress?: boolean;

  constructor(
    private cdr: ChangeDetectorRef,
    private storageService: StorageService,
  ) {}

  public async delete(): Promise<void> {
    this.showStatusModal = true;
    this.showDeleteProgress = true;

    this.cdr.markForCheck();

    await this.storageService.deleteDb();

    this.showDeleteProgress = false;

    this.cdr.markForCheck();
  }

  public closeStatusAlert(): void {
    this.showStatusModal = false;
  }
}
