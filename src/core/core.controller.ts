/* eslint-disable */
import { Controller, Get } from '@nestjs/common';
import { DriveService } from './drive.service';
import { LocalService } from './local.service';
import { CoreService } from './core.service';

@Controller('core')
export class CoreController {
  constructor(
    private readonly coreService: CoreService,
    private readonly driveService: DriveService,
    private readonly localService: LocalService,
  ) {}

  @Get('combined')
  async getCombinedFiles(): Promise<any> {
    const localPath = 'I:\\SuperTest';
    const drivePath = '1dxzVuqpq7rSPxmcI0xVCWOjNO_FkNtB4';

    return await this.coreService.syncFolder(
      '85cf3fdf-42e8-49d2-ad74-4e2ace79a54f',
    );
  }
}
