import { Module } from '@nestjs/common';
import { DependencyModule } from 'src/dependency.module';
import { FolderController } from './folder.controller';

@Module({
  imports: [DependencyModule],
  controllers: [FolderController],
  providers: [],
})
export class FolderModule {}
