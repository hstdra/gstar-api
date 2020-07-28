import { Module } from '@nestjs/common';
import { DependencyModule } from 'src/dependency.module';

@Module({
  imports: [DependencyModule],
})
export class CoreModule {}
