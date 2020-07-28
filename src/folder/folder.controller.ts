/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Controller, Get, Param, Body, Put, Delete, Post } from '@nestjs/common';
import { FolderService } from './folder.service';
import { Folder } from './folder.entity';
import { CoreService } from 'src/core/core.service';

@Controller('folders')
export class FolderController {
  constructor(
    private readonly folderService: FolderService,
    private readonly coreService: CoreService,
  ) {}

  @Get()
  async findFolders(): Promise<Folder[]> {
    return this.folderService.findFolders();
  }

  @Get('/:folderId')
  async findFolder(@Param('folderId') folderId: string): Promise<Folder> {
    return this.folderService.findFolder(folderId);
  }

  @Post('/:folderId/autoSync')
  async autoSyncFolder(@Param('folderId') folderId: string): Promise<any> {
    await this.coreService.autoSyncFolder(folderId);
  }

  @Put()
  async saveFolder(@Body() folder: Folder): Promise<Folder> {
    return this.folderService.saveFolderInfo(folder);
  }

  @Delete('/:folderId')
  async deleteFolder(@Param('folderId') folderId: string): Promise<any> {
    return this.folderService.deleteFolder(folderId);
  }
}
