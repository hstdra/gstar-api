/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { OAuth2Service } from './oauth2.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly oAuth2Service: OAuth2Service,
    private readonly userService: UserService,
  ) {
    super(oAuth2Service.getConfig());
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    this.oAuth2Service.setCredentials(accessToken, refreshToken);
    const user = await this.userService.saveCurrentUser(profile);

    done(null, { ...user, accessToken, refreshToken });
  }

  authorizationParams(options: any): any {
    return Object.assign(options, {
      prompt: 'consent',
      access_type: 'offline',
    });
  }
}
