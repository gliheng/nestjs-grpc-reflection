import { GrpcOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { addReflectionToGrpcConfig } from 'src/grpc-reflection/utils';

export const grpcClientOptions: GrpcOptions = addReflectionToGrpcConfig({
  transport: Transport.GRPC,
  options: {
    package: 'sample',
    protoPath: join(__dirname, './proto/sample.proto'),
    loader: {
      oneofs: true,
      includeDirs: [join(__dirname, './proto/vendor/')],
    },
  },
});
