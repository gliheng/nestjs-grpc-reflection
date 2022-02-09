import { Module } from '@nestjs/common';
import { grpcClientOptions } from '../grpc-client.options';
import { GrpcReflectionModule } from '../grpc-reflection/grpc-reflection.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [GrpcReflectionModule.register(grpcClientOptions)],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
