/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as mime from 'mime-types';
import * as md5File from 'md5-file';

@Injectable()
export class LocalService {
  async getLocalFiles(localPath: string): Promise<any> {
    try {
      const files = await fs.readdirSync(localPath, { withFileTypes: true });

      const promises = files.map(async file => {
        while (true) {
          try {
            const filePath = `${localPath}\\${file.name}`;
            const stat = fs.statSync(filePath);

            const newFile = {
              name: file.name,
              mimeType: mime.lookup(filePath),
              localModifiedTime: stat.mtime,
              size: stat.size,
              localMd5: file.isDirectory() ? null : md5File.sync(filePath),
              isDirectory: file.isDirectory(),
              children: null,
            };

            if (file.isDirectory()) {
              newFile.children = await this.getLocalFiles(
                `${localPath}\\${file.name}`,
              );
            }

            return newFile;
          } catch (error) {
            console.log(error);
          }
        }
      });

      return Promise.all(promises);
    } catch (error) {
      return [];
    }
  }

  async deleteFile(file: any, callBackSave: any): Promise<void> {
    try {
      if (file.isDirectory) {
        fs.rmdirSync(file.path, { recursive: true });
      } else {
        fs.unlinkSync(file.path);
      }
      await callBackSave();
    } catch (error) {
      console.log(error);
    }
  }
}
