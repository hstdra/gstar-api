/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@nestjs/common';
import { LocalService } from './local.service';
import { DriveService } from './drive.service';
import * as fs from 'fs';
import { FolderService } from 'src/folder/folder.service';
import { Folder } from 'src/folder/folder.entity';
import * as moment from 'moment';

@Injectable()
export class CoreService {
  constructor(
    private readonly driveService: DriveService,
    private readonly localService: LocalService,
    private readonly folderService: FolderService,
  ) {}

  async getFolder(folderId: string): Promise<Folder> {
    const folder = await this.folderService.findFolder(folderId);
    const files = await this.getCombinedFiles(folder);
    folder.files = files.filter(file => file.status !== 'BOTH_DELETED');
    this.syncFolder(folder, folder.files, true);

    return folder;
  }

  async getCombinedFiles({ localPath, drivePath, files }): Promise<any> {
    const driveFiles = drivePath
      ? await this.driveService.getDriveFiles(drivePath)
      : [];
    const localFiles = await this.localService.getLocalFiles(localPath);

    let combinedFiles = Object.assign(files);

    localFiles.forEach(async localFile => {
      let combinedFile = combinedFiles.find(x => x.name === localFile.name);

      if (!combinedFile) {
        combinedFile = localFile;
        combinedFiles.push(combinedFile);
      }

      combinedFile.localModifiedTime = localFile.localModifiedTime;
      combinedFile.localMd5 = localFile.localMd5;
      combinedFile.localSize = localFile.size;
    });

    driveFiles.forEach(async driveFile => {
      let combinedFile = combinedFiles.find(x => x.name === driveFile.name);

      if (!combinedFile) {
        combinedFile = driveFile;
        combinedFiles.push(combinedFile);
      }

      combinedFile.id = combinedFile.id || driveFile.id;
      combinedFile.driveModifiedTime = moment(driveFile.modifiedTime).toDate();
      combinedFile.driveMd5 = driveFile.md5Checksum;
      combinedFile.driveSize = driveFile.size;
    });

    combinedFiles = combinedFiles.map(async file => {
      file.path = `${localPath}\\${file.name}`;
      file.parentId = drivePath;

      // Verify folder
      if (
        file.isDirectory ||
        file.mimeType === 'application/vnd.google-apps.folder'
      ) {
        if (
          !file.isExistBefore ||
          (file.localModifiedTime && file.driveModifiedTime)
        ) {
          if (!fs.existsSync(file.path)) {
            fs.mkdirSync(file.path);
          }

          if (!file.id) {
            await this.driveService.createFolder(file);
          }

          file.isDirectory = true;
          file.mimeType === 'application/vnd.google-apps.folder';
          file.status = 'FOLDER';
          file.isExistBefore = true;

          file.children = await this.getCombinedFiles({
            localPath: file.path,
            drivePath: file.id,
            files: file.children || [],
          });
        } else if (file.isExistBefore && !file.localModifiedTime) {
          file.status = 'LOCAL_DELETED';
        } else if (file.isExistBefore && !file.driveModifiedTime) {
          file.status = 'DRIVE_DELETED';
        }

        delete file.localModifiedTime;
        delete file.driveModifiedTime;
      }

      return file;
    });

    combinedFiles = await Promise.all(combinedFiles);

    await this.updateStatus(combinedFiles);

    return combinedFiles;
  }

  async updateStatus(files: any): Promise<any> {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.isDirectory) continue;

      if (
        file.localModifiedTime &&
        file.driveModifiedTime &&
        (file.localMd5 === file.driveMd5 ||
          file.localModifiedTime === file.driveModifiedTime)
      ) {
        file.status = 'SYNCED';
        file.isExistBefore = true;

        file.modifiedTime = file.localModifiedTime || file.driveModifiedTime;
        file.md5 = file.localMd5 || file.driveMd5;
        file.size = file.localSize || file.driveSize;
      } else if (
        (file.localModifiedTime && !file.driveModifiedTime) ||
        file.localModifiedTime > file.driveModifiedTime
      ) {
        if (
          file.isExistBefore &&
          !file.driveModifiedTime &&
          file.status !== 'WAITING_UPLOAD'
        ) {
          file.status = 'DRIVE_DELETED';
        } else {
          file.modifiedTime = file.localModifiedTime;
          file.md5 = file.localMd5;
          file.size = file.localSize;
          file.status = 'WAITING_UPLOAD';
        }
      } else if (
        (!file.localModifiedTime && file.driveModifiedTime) ||
        file.localModifiedTime < file.driveModifiedTime
      ) {
        if (
          file.isExistBefore &&
          !file.localModifiedTime &&
          file.status !== 'WAITING_DOWNLOAD'
        ) {
          file.status = 'LOCAL_DELETED';
        } else {
          file.modifiedTime = file.driveModifiedTime;
          file.md5 = file.driveMd5;
          file.size = file.driveSize;
          file.status = 'WAITING_DOWNLOAD';
        }
      } else if (!file.localModifiedTime && !file.driveModifiedTime) {
        file.status = 'BOTH_DELETED';
      }

      delete file.localModifiedTime;
      delete file.driveModifiedTime;
      delete file.localMd5;
      delete file.driveMd5;
      delete file.localSize;
      delete file.driveSize;
    }
  }

  async syncFolder(folder: Folder, files: any, isRoot: boolean): Promise<void> {
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const callBackSave = async () => {
        this.folderService.saveFolderFiles(folder);
      };

      switch (file.status) {
        case 'WAITING_UPLOAD':
          console.log(`Uploading ${file.name}`);
          await this.driveService.uploadFile(file, callBackSave);
          break;

        case 'WAITING_DOWNLOAD':
          console.log(`Downloading ${file.name}`);
          await this.driveService.downloadFile(file, callBackSave);
          break;

        case 'LOCAL_DELETED':
          files.splice(index, 1);
          console.log(`Drive delete ${file.name}`);
          await this.driveService.deleteFile(file, callBackSave);
          break;

        case 'DRIVE_DELETED':
          files.splice(index, 1);
          console.log(`Local delete ${file.name}`);
          await this.localService.deleteFile(file, callBackSave);
          break;
      }

      if (file.isDirectory && file.children.length > 0) {
        await this.syncFolder(folder, file.children, false);
      }
    }

    if (isRoot) {
      this.folderService.saveFolderFiles(folder);

      // setTimeout(() => {
      //   console.log(`${folder.id}: ${new Date().toISOString()}`);

      //   this.getFolder(folder.id);
      // }, 3000);
    }
  }
}
