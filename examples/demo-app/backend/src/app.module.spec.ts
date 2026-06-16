import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('wires up the AppController', () => {
    expect(moduleRef.get(AppController)).toBeInstanceOf(AppController);
  });

  it('wires up the AppService', () => {
    expect(moduleRef.get(AppService)).toBeInstanceOf(AppService);
  });
});
