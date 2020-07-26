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

  async getFolders(): Promise<Folder[]> {
    const user = await this.userService.getCurrentUser();

    return await this.folderRepo.find({
      where: { userId: user.id },
      select: ['id', 'localPath', 'drivePath'],
    });
  }

  async findOne(folderId: string): Promise<Folder> {
    const folder = await this.folderRepo.findOne(folderId);

    return folder.beautify();
  }

  async saveFolder(folder: Folder): Promise<Folder> {
    const existedFolder = await this.folderRepo.findOne({
      where: {
        localPath: folder.localPath,
        drivePath: folder.drivePath,
      },
    });

    if (existedFolder) {
      existedFolder.files = folder.files;
      await this.folderRepo.save(existedFolder);

      return existedFolder.beautify();
    } else {
      folder.userId = (await this.userService.getCurrentUser()).id;
      await this.folderRepo.save(folder);

      return folder.beautify();
    }
  }
}
