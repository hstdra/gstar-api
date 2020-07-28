/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@nestjs/common';
import { LocalService } from './local.service';
import { DriveService } from './drive.service';
import * as fs from 'fs';
import { FolderService } from 'src/folder/folder.service';
import { Folder } from 'src/folder/folder.entity';
import * as moment from 'moment';
import * as uuid from 'uuid';
import { AppGateway } from 'src/app.gateway';
import { setTimeout } from 'timers';

@Injectable()
export class CoreService {
  private isNew = false;
  private data = new Map();
  private folderJobs = new Map<string, Map<string, any>>();

  constructor(
    private readonly driveService: DriveService,
    private readonly localService: LocalService,
    private readonly folderService: FolderService,
    private readonly appGateway: AppGateway,
  ) {
    this.reset();
  }

  async reset(): Promise<void> {
    this.updateData().then(() => {
      this.autoSyncAll();
      this.autoSendData();
    });
  }

  async clear(): Promise<void> {
    const folders = await this.folderService.findFolders();
    
    folders
      .filter(folder => folder.autoSync)
      .forEach(folder => {
        this.folderJobs.delete(folder.id);
        this.folderService.saveFolderKey(folder.id, '');
      });
  }

  async addFolderJob(folderId: string): Promise<any> {
    if (!this.folderJobs.has(folderId)) {
      this.folderJobs.set(folderId, new Map());
    }
    const uid = uuid.v4();
    this.folderJobs.get(folderId).set(uid, null);

    return () => this.folderJobs.get(folderId).delete(uid);
  }

  async isEmptyFolderJob(folderId): Promise<boolean> {
    const folderJob = this.folderJobs.get(folderId);

    return !folderJob || !folderJob.size;
  }

  async updateData() {
    this.folderService.findFolders(true).then(folders => {
      this.data = folders.reduce((acc, folder) => {
        folder.beautify();
        return acc.set(folder.id, folder);
      }, new Map());
      this.isNew = true;
    });
  }

  async updateFolderData(folder: Folder, files: any) {
    this.data.set(folder.id, { ...folder, files });
    this.isNew = true;
  }

  async autoSendData() {
    setInterval(() => {
      if (this.isNew) {
        this.appGateway.server.emit('data', Array.from(this.data.values()));
        this.isNew = false;
      }
    }, 1000);
  }

  async autoSyncAll() {
    const folders = await this.folderService.findFolders();
    folders
      .filter(folder => folder.autoSync)
      .forEach(folder => {
        this.autoSyncFolder(folder.id);
      });
  }

  async autoSyncFolder(folderId: string): Promise<void> {
    const autoKey = uuid.v4();
    const folder = await this.folderService.findFolder(folderId);
    await this.folderService.saveFolderKey(folderId, autoKey);

    if (folder.autoSync) {
      await this.syncFolder(folderId, autoKey);
    }
  }

  async syncFolder(folderId: string, autoKey?: string): Promise<Folder> {
    const folder = await this.folderService.findFolder(folderId);
    folder.files = await this.getCombinedFiles(folder);
    this.completeFolder(folder, folder.files, true, autoKey);

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

  async completeFolder(
    folder: Folder,
    files: any,
    isRoot: boolean,
    autoKey?: string,
  ): Promise<void> {
    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      if (
        [
          'WAITING_UPLOAD',
          'WAITING_DOWNLOAD',
          'LOCAL_DELETED',
          'DRIVE_DELETED',
          'BOTH_DELETED',
        ].includes(file.status)
      ) {
        const clearJob = await this.addFolderJob(folder.id);

        const callBackSave = async () => {
          delete file.progress;
          await this.folderService.saveFolderFiles(folder, files);
          await clearJob();
        };

        switch (file.status) {
          case 'WAITING_UPLOAD':
            console.log(`Uploading ${file.name}`);
            this.driveService.uploadFile(file, callBackSave);

            break;

          case 'WAITING_DOWNLOAD':
            console.log(`Downloading ${file.name}`);

            this.driveService.downloadFile(file, callBackSave);

            break;

          case 'LOCAL_DELETED':
            files.splice(index, 1);

            console.log(`Drive deleted ${file.name}`);
            await this.driveService.deleteFile(file, callBackSave);

            break;

          case 'DRIVE_DELETED':
            files.splice(index, 1);
            console.log(`Local deleted ${file.name}`);
            await this.localService.deleteFile(file, callBackSave);

            break;

          case 'BOTH_DELETED':
            files.splice(index, 1);
            await callBackSave();

            break;
        }
      }

      if (file.isDirectory && file.children.length > 0) {
        await this.completeFolder(folder, file.children, false);
      }
    }

    if (isRoot) {
      const interval = setInterval(async () => {
        await this.updateFolderData(folder, files);

        if (await this.isEmptyFolderJob(folder.id)) {
          this.folderService.saveFolderFiles(folder, files);

          if (autoKey) {
            const newFolder = await this.folderService.findFolder(folder.id);

            if (autoKey === newFolder.autoKey) {
              setTimeout(() => {
                console.log(`[DONE] ${folder.id}: ${new Date().toISOString()}`);

                this.syncFolder(folder.id, autoKey);
              }, 3500);
            } else {
              console.log(`[END] ${folder.id}: ${new Date().toISOString()}`);
            }
          }

          clearInterval(interval);
        }
      }, 200);
    }
  }
}
