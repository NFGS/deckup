import { Global, Module } from '@nestjs/common';

import { SchedulerPort } from '../../domain/ports/scheduler.port.js';
import { SchedulingService } from '../../domain/services/scheduling.service.js';
import { TsFsrsScheduler } from './ts-fsrs.scheduler.js';

@Global()
@Module({
  providers: [
    { provide: SchedulerPort, useClass: TsFsrsScheduler },
    {
      provide: SchedulingService,
      inject: [SchedulerPort],
      useFactory: (scheduler: SchedulerPort) => new SchedulingService(scheduler),
    },
  ],
  exports: [SchedulerPort, SchedulingService],
})
export class SchedulingModule {}
