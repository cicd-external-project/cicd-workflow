import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('findAll', () => {
    it('returns the seeded tasks', () => {
      const tasks = service.findAll();
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual({
        id: 1,
        title: 'Wire up FlowCI access gate',
        done: true,
      });
    });
  });

  describe('findOne', () => {
    it('returns the task when it exists', () => {
      expect(service.findOne(1)).toEqual({
        id: 1,
        title: 'Wire up FlowCI access gate',
        done: true,
      });
    });

    it('throws NotFoundException when the task does not exist', () => {
      expect(() => service.findOne(999)).toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('adds a new task with done=false and an incrementing id', () => {
      const created = service.create({ title: 'Ship the example app' });

      expect(created).toEqual({
        id: 3,
        title: 'Ship the example app',
        done: false,
      });
      expect(service.findAll()).toHaveLength(3);
      expect(service.findOne(created.id)).toEqual(created);
    });

    it('assigns unique, increasing ids across multiple creates', () => {
      const first = service.create({ title: 'First' });
      const second = service.create({ title: 'Second' });

      expect(second.id).toBe(first.id + 1);
    });
  });
});
