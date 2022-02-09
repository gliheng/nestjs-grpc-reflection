import { DynamicModule, Module } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';
import { GrpcReflectionController, GRPC_CONFIG_PROVIDER_TOKEN } from './grpc-reflection.controller';

@Module({})
export class GrpcReflectionModule {
  static register(grpcOptions: GrpcOptions): DynamicModule {
    return {
      module: GrpcReflectionModule,
      controllers: [GrpcReflectionController],
      providers: [{
        provide: GRPC_CONFIG_PROVIDER_TOKEN,
        useValue: grpcOptions
      }]
    };
  }
}
