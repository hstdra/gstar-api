/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  private currentUser: User;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    // Temp for dev
    this.currentUser = new User();
    this.currentUser.id = 'cd8e2eea-88eb-4929-932f-b72dd9073982';
  }

  async saveCurrentUser(profile: any): Promise<User> {
    this.currentUser = await this.userRepo.findOne({
      where: { email: profile.emails[0].value },
    });

    if (!this.currentUser) {
      this.currentUser = new User();
      this.currentUser.email = profile.emails[0].value;
    }

    this.currentUser.name = profile.displayName;
    this.currentUser.avatar = profile.photos[0].value;

    return this.userRepo.save(this.currentUser);
  }

  async getCurrentUser(): Promise<User> {
    return this.currentUser;
  }
}
