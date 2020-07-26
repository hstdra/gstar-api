import { Module } from '@nestjs/common';
import { CoreController } from './core.controller';
import { DependencyModule } from 'src/dependency.module';

@Module({
  imports: [DependencyModule],
  controllers: [CoreController],
  providers: [],
})
export class CoreModule {}
