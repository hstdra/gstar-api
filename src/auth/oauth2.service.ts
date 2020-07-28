import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

@Injectable()
export class OAuth2Service {
  private readonly clientId: string = process.env.GOOGLE_CLIENT_ID;
  private readonly clientSecret: string = process.env.GOOGLE_SECRET;
  private readonly redirectUrl: string = process.env.GOOGLE_REDIRECT_URI;

  private oAuth2Client: OAuth2Client;

  constructor() {
    this.oAuth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUrl,
    );

    // Temp for dev
    this.setCredentials(
      process.env.GOOGLE_ACCESS_TOKEN,
      process.env.GOOGLE_REFRESH_TOKEN,
    );
  }

  setCredentials(accessToken: string, refreshToken: string): void {
    this.oAuth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    console.log(
      'OAuth2Service -> setCredentials -> refreshToken',
      refreshToken,
    );
    console.log('OAuth2Service -> setCredentials -> accessToken', accessToken);
  }

  getOAuth2Client(): OAuth2Client {
    return this.oAuth2Client;
  }

  getConfig(): any {
    return {
      clientID: this.clientId,
      clientSecret: this.clientSecret,
      callbackURL: this.redirectUrl,
      scope: ['email', 'profile', 'https://www.googleapis.com/auth/drive'],
    };
  }
}
