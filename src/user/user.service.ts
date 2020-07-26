/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable, Scope } from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable({ scope: Scope.DEFAULT })
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async saveCurrentUser(profile: any): Promise<User> {
    let user = await this.userRepo.findOne({
      where: { email: profile.emails[0].value },
    });
    if (!user) {
      user = new User();
      user.email = profile.emails[0].value;
    }
    user.name = profile.displayName;
    user.avatar = profile.photos[0].value;
    user.isCurrentUser = true;

    this.userRepo.update({ isCurrentUser: true }, { isCurrentUser: false });

    return this.userRepo.save(user);
  }

  async getCurrentUser(): Promise<User> {
    return this.userRepo.findOne({ where: { isCurrentUser: true } });
  }
}
