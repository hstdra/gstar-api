import { Module } from '@nestjs/common';
import { CoreController } from './core.controller';
import { DriveService } from './drive.service';
import { OAuth2Service } from 'src/auth/oauth2.service';
import { LocalService } from './local.service';
import { CoreService } from './core.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Folder } from '../folder/folder.entity';
import { FolderService } from 'src/folder/folder.service';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Folder])],
  controllers: [CoreController],
  providers: [
    OAuth2Service,
    DriveService,
    LocalService,
    CoreService,
    FolderService,
    UserService,
  ],
})
export class CoreModule {}
