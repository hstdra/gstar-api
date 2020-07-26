import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './auth.strategy';
import { DependencyModule } from 'src/dependency.module';

@Module({
  imports: [DependencyModule],
  controllers: [AuthController],
  providers: [GoogleStrategy],
})
export class AuthModule {}
