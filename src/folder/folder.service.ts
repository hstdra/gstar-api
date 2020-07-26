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

  async findFolders(): Promise<Folder[]> {
    const user = await this.userService.getCurrentUser();

    return this.folderRepo.find({
      where: { userId: user.id },
      select: ['id', 'localPath', 'drivePath', 'autoSync'],
    });
  }

  async findFolder(folderId: string): Promise<Folder> {
    const folder = await this.folderRepo.findOne(folderId);

    return folder.beautify();
  }

  async deleteFolder(folderId: string): Promise<any> {
    return this.folderRepo.delete({ id: folderId });
  }

  async saveFolderFiles(folder: Folder): Promise<Folder> {
    await this.folderRepo.update(
      { id: folder.id },
      { files: JSON.stringify(folder.files) },
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
      await this.folderRepo.save(folder);

      return folder;
    }
  }
}
