import { GrpcOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

export const grpcClientOptions: GrpcOptions = {
  transport: Transport.GRPC,
  options: {
    package: ['sample', 'grpc.reflection.v1alpha'],
    protoPath: [
      join(__dirname, 'sample/proto/sample.proto'),
      join(__dirname, 'grpc-reflection/proto/grpc/reflection/v1alpha/reflection.proto')
    ],
    loader: {
      keepCase: true,
      oneofs: true
    }
  },
};
