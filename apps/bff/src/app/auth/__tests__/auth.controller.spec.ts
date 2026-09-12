import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockResult = {
    accessToken: 'tok',
    user: { sub: 'u1', username: 'admin', email: 'admin@example.com', roles: ['admin'] },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { login: jest.fn().mockReturnValue(mockResult) },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('calls authService.login with dto credentials and returns result', () => {
    const result = controller.login({ username: 'admin', password: 'admin' });
    expect(authService.login).toHaveBeenCalledWith('admin', 'admin');
    expect(result).toBe(mockResult);
  });
});
