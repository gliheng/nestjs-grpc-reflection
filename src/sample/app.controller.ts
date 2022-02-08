import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller('sample')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @GrpcMethod('SampleService', 'hello')
  hello(): { world: string } {
    return { world: this.appService.getHello() };
  }
}
