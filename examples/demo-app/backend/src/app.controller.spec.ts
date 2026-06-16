import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHello', () => {
    it('should return "Hello from FlowCI Demo Backend!"', () => {
      expect(appController.getHello()).toBe('Hello from FlowCI Demo Backend!');
    });
  });

  describe('getHealth', () => {
    it('should return { status: "ok" }', () => {
      expect(appController.getHealth()).toEqual({ status: 'ok' });
    });
  });
});
