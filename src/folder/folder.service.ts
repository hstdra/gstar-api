/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@nestjs/common';
import { Folder } from './folder.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';

@Injectable()
export class FolderService {
  constructor(
    @InjectRepository(Folder) private readonly folderRepo: Repository<Folder>,
    private readonly userService: UserService,
  ) {}

  async findFolders(isGetFiles?): Promise<Folder[]> {
    const user = await this.userService.getCurrentUser();

    if (isGetFiles) {
      return this.folderRepo.find({
        where: { userId: user.id },
      });
    }

    return this.folderRepo.find({
      where: { userId: user.id },
      select: ['id', 'localPath', 'drivePath', 'autoSync', 'autoKey'],
    });
  }

  async findFolder(folderId: string): Promise<Folder> {
    const folder = await this.folderRepo.findOne(folderId);

    return folder.beautify();
  }

  async deleteFolder(folderId: string): Promise<any> {
    return this.folderRepo.delete({ id: folderId });
  }

  async saveFolderFiles(folder: Folder, files: any): Promise<Folder> {
    await this.folderRepo.update(
      { id: folder.id },
      { files: JSON.stringify(files) },
    );

    return folder.beautify();
  }

  async saveFolderInfo(folder: Folder): Promise<Folder> {
    if (folder.id) {
      await this.folderRepo.update(
        { id: folder.id },
        {
          localPath: folder.localPath,
          drivePath: folder.drivePath,
          autoSync: folder.autoSync,
        },
      );

      return folder;
    } else {
      folder.userId = (await this.userService.getCurrentUser()).id;
      folder.files = JSON.parse('[]');
      folder.autoSync = false;
      folder.autoKey = '';
      await this.folderRepo.save(folder);

      return folder;
    }
  }

  async saveFolderKey(folderId: string, autoKey: string): Promise<void> {
    await this.folderRepo.update(
      { id: folderId },
      {
        autoKey,
      },
    );
  }
}
