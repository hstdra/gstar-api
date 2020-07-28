import { Injectable, CanActivate, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserService } from 'src/user/user.service';

@Injectable()
export class LocalGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  canActivate(): boolean | Promise<boolean> | Observable<boolean> {
    return this.userService.getCurrentUser().then(user => {
      if (user) {
        return true;
      }
      throw new UnauthorizedException();
    });
  }
}
