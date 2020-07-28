import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { DependencyModule } from 'src/dependency.module';

@Module({
  imports: [DependencyModule],
  controllers: [AuthController],
})
export class AuthModule {}
