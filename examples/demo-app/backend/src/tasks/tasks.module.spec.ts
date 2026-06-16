import { Test, TestingModule } from '@nestjs/testing';
import { TasksModule } from './tasks.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TasksModule],
    }).compile();
  });

  it('wires up the TasksController', () => {
    expect(moduleRef.get(TasksController)).toBeInstanceOf(TasksController);
  });

  it('wires up the TasksService', () => {
    expect(moduleRef.get(TasksService)).toBeInstanceOf(TasksService);
  });
});
