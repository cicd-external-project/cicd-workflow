import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import type { Task } from './task.entity';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [TasksService],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  it('findAll delegates to the service', () => {
    const result = controller.findAll();
    expect(result).toEqual(service.findAll());
  });

  it('findOne delegates to the service with the parsed id', () => {
    const spy = jest.spyOn(service, 'findOne');
    const result = controller.findOne(1);

    expect(spy).toHaveBeenCalledWith(1);
    expect(result.id).toBe(1);
  });

  it('create delegates to the service and returns the new task', () => {
    const spy = jest.spyOn(service, 'create');
    const result: Task = controller.create({ title: 'New task' });

    expect(spy).toHaveBeenCalledWith({ title: 'New task' });
    expect(result.title).toBe('New task');
    expect(result.done).toBe(false);
  });
});
