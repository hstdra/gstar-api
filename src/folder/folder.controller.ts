/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  Controller,
  Get,
  Param,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { FolderService } from './folder.service';
import { Folder } from './folder.entity';

@Controller('folders')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Get()
  async findFolders(): Promise<Folder[]> {
    return this.folderService.findFolders();
  }

  @Get('/:folderId')
  async findFolder(@Param('folderId') folderId: string): Promise<Folder> {
    return this.folderService.findFolder(folderId);
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
