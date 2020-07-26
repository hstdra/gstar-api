import { Module } from '@nestjs/common';
import { OAuth2Service } from './auth/oauth2.service';
import { DriveService } from './core/drive.service';
import { LocalService } from './core/local.service';
import { CoreService } from './core/core.service';
import { FolderService } from './folder/folder.service';
import { UserService } from './user/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user/user.entity';
import { Folder } from './folder/folder.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Folder])],
  providers: [
    OAuth2Service,
    UserService,
    DriveService,
    LocalService,
    CoreService,
    FolderService,
  ],
  exports: [
    OAuth2Service,
    UserService,
    DriveService,
    LocalService,
    CoreService,
    FolderService,
  ],
})
export class DependencyModule {}
