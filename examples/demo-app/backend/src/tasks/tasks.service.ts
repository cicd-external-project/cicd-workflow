import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { Task } from './task.entity';

@Injectable()
export class TasksService {
  private readonly tasks: Task[] = [
    { id: 1, title: 'Wire up FlowCI access gate', done: true },
    { id: 2, title: 'Review generated quality workflow', done: false },
  ];

  private nextId = this.tasks.length + 1;

  findAll(): Task[] {
    return this.tasks;
  }

  findOne(id: number): Task {
    const task = this.tasks.find((candidate) => candidate.id === id);
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  create(dto: CreateTaskDto): Task {
    const task: Task = {
      id: this.nextId++,
      title: dto.title,
      done: false,
    };
    this.tasks.push(task);
    return task;
  }
}
