import { Test, TestingModule } from '@nestjs/testing';
import { DeviceSyncLogsController } from './device-sync-logs.controller';

describe('DeviceSyncLogsController', () => {
  let controller: DeviceSyncLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceSyncLogsController],
    }).compile();

    controller = module.get<DeviceSyncLogsController>(DeviceSyncLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
