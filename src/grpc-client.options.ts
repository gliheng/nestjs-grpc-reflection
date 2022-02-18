import { GrpcOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { REFLECTION_PACKAGE, REFLECTION_PROTO } from './grpc-reflection/grpc-reflection.constants';

export const grpcClientOptions: GrpcOptions = {
  transport: Transport.GRPC,
  options: {
    package: ['sample', REFLECTION_PACKAGE],
    protoPath: [
      join(__dirname, 'sample/proto/sample.proto'),
      REFLECTION_PROTO
    ],
    loader: {
      oneofs: true,
      includeDirs: [
        join(__dirname, 'sample/proto/vendor/')
      ]
    }
  },
};
