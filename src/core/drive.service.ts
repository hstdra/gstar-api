/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { OAuth2Service } from '../auth/oauth2.service';
import * as moveFile from 'move-file';
import * as uuid from 'uuid';
import * as moment from 'moment';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as mime from 'mime-types';

@Injectable()
export class DriveService {
  private drive: drive_v3.Drive;

  constructor(private readonly oAuth2Service: OAuth2Service) {
    this.drive = google.drive({
      version: 'v3',
      auth: this.oAuth2Service.getOAuth2Client(),
    });
  }

  async getDriveFiles(drivePath: string): Promise<any> {
    const files = (
      await this.drive.files.list({
        pageSize: 1000,
        fields: 'files(id, name, mimeType, modifiedTime, md5Checksum, size)',
        spaces: 'drive',
        q: `'${drivePath}' in parents and trashed=false`,
      })
    ).data.files;

    return files.map(file => {
      // file.modifiedTime = moment(file.modifiedTime).toDate();
      return file;
    });
  }

  async createFolder(file: any): Promise<void> {
    const fileMetadata = {
      name: file.name,
      parents: [file.parentId],
      createdTime: file.localModifiedTime,
      modifiedTime: file.localModifiedTime,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const res = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    file.id = res.data.id;
    file.driveModifiedTime = file.localModifiedTime;
  }

  async downloadFile(file: any, callBackSave: any): Promise<void> {
    if (file.isDirectory) return;

    try {
      const tempPath = path.join(os.tmpdir(), uuid.v4());
      const writer = fs.createWriteStream(tempPath);
      let bytes = 0;
      let threshHold = 0;

      await this.drive.files
        .get({ fileId: file.id, alt: 'media' }, { responseType: 'stream' })
        .then(res => {
          res.data
            .on('error', err => console.log(err))
            .on('data', d => {
              bytes += d.length;
              file.progress = Math.round((bytes / file.size) * 100);
              file.status = 'DOWNLOADING';

              if (file.progress >= threshHold) {
                threshHold += 5;

                // ioService.emit('data', data);
              }
            })
            .on('end', async () => {
              fs.utimesSync(
                tempPath,
                moment(file.modifiedTime).toDate(),
                moment(file.modifiedTime).toDate(),
              );

              moveFile(tempPath, file.path).then(() => {
                file.status = 'SYNCED';
                // ioService.emit('data', data);
              });

              await callBackSave();
            })
            .pipe(writer);
        });
    } catch (error) {
      console.log(error);
    }
  }

  async uploadFile(file: any, callBackSave: any): Promise<void> {
    if (file.isDirectory) return;

    try {
      const body = fs.createReadStream(file.path);
      let threshHold = 0;

      const fileMetadata = {
        name: file.name,
        modifiedTime: file.modifiedTime,
      };
      const media = {
        mimeType: mime.lookup(file.path),
        body,
      };

      if (file.id) {
        await this.drive.files
          .update(
            {
              fileId: file.id,
              requestBody: fileMetadata,
              media: media,
              fields: 'id',
            },
            {
              onUploadProgress: evt => {
                file.progress = Math.round((evt.bytesRead / file.size) * 100);
                file.status = 'UPLOADING';

                if (file.progress >= threshHold) {
                  threshHold += 5;
                  // ioService.emit('data', data);
                }
              },
            },
          )
          .then(async () => {
            file.status = 'SYNCED';
            await callBackSave();
            // ioService.emit('data', data);
          })
          .catch(error => {
            console.log(error);
          });
      } else {
        await this.drive.files
          .create(
            {
              requestBody: { ...fileMetadata, parents: [file.parentId] },
              media: media,
              fields: 'id',
            },
            {
              onUploadProgress: evt => {
                file.progress = Math.round((evt.bytesRead / file.size) * 100);
                file.status = 'UPLOADING';

                if (file.progress >= threshHold) {
                  threshHold += 5;
                  // ioService.emit('data', data);
                }
              },
            },
          )
          .then(async () => {
            file.status = 'SYNCED';

            await callBackSave();
            // ioService.emit('data', data);
          })
          .catch(error => {
            console.log(error);
          });
      }
    } catch (error) {
      console.log(error);
    }
  }

  async deleteFile(file: any, callBackSave: any): Promise<void> {
    try {
      await this.drive.files.delete({ fileId: file.id });
      await callBackSave();
    } catch (error) {
      console.log(error);
    }
  }
}
