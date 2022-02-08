import { GrpcOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

export const grpcClientOptions: GrpcOptions = {
  transport: Transport.GRPC,
  options: {
    package: 'sample',
    protoPath: join(__dirname, 'sample/proto/sample.proto'),
    loader: {
      keepCase: true
    }
  },
};
