import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../notifications.controller';
import { NotificationsService } from '../notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: { findAllNotifications: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service    = module.get(NotificationsService);
  });

  it('getAllNotifications delegates to service and returns results', async () => {
    const notifications = [{ orderId: 'ord-1', customerId: 'cust-1', totalAmount: 50 }] as never[];
    service.findAllNotifications.mockResolvedValue(notifications);

    const result = await controller.getAllNotifications();

    expect(service.findAllNotifications).toHaveBeenCalled();
    expect(result).toBe(notifications);
  });
});
