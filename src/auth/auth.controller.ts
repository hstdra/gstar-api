/* eslint-disable */
import { Controller, Get, Req, UseGuards, Redirect } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import { LocalGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('redirect')
  @UseGuards(AuthGuard('google'))
  @Redirect(`${process.env.FRONT_END_HOST}/auth`, 302)
  googleAuthRedirect() {
    return { url: `${process.env.FRONT_END_HOST}/auth` };
  }

  @Get('profile')
  @UseGuards(LocalGuard)
  getProfile() {
    return this.userService.getCurrentUser();
  }

  @Get('logout')
  logOut() {
    return this.userService.logOut();
  }
}
