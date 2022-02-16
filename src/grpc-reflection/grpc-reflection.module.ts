import { DynamicModule, Module } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';
import { GrpcReflectionController } from './grpc-reflection.controller';
import { GRPC_CONFIG_PROVIDER_TOKEN } from './grpc-reflection.constants';
import { GrpcReflectionService } from './grpc-reflection.service';

@Module({})
export class GrpcReflectionModule {
  static register(grpcOptions: GrpcOptions): DynamicModule {
    return {
      module: GrpcReflectionModule,
      controllers: [GrpcReflectionController],
      providers: [
        GrpcReflectionService,
        {
          provide: GRPC_CONFIG_PROVIDER_TOKEN,
          useValue: grpcOptions
        }
      ]
    };
  }
}
