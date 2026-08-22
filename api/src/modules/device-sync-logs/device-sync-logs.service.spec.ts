import { Test, TestingModule } from '@nestjs/testing';
import { DeviceSyncLogsService } from './device-sync-logs.service';

describe('DeviceSyncLogsService', () => {
  let service: DeviceSyncLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceSyncLogsService],
    }).compile();

    service = module.get<DeviceSyncLogsService>(DeviceSyncLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
