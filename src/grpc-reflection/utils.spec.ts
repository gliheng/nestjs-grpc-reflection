import { GrpcOptions, Transport } from '@nestjs/microservices';

import { addReflectionToGrpcConfig } from './utils';

describe('addReflectionToGrpcConfig', () => {
  it('appends the grpc proto/package to the current protos/package list', () => {
    const options: GrpcOptions = {
      transport: Transport.GRPC,
      options: {
        protoPath: ['test.proto'],
        package: ['test'],
      },
    };

    const converted = addReflectionToGrpcConfig(options);
    expect(converted.options.package).toHaveLength(2);
    expect(converted.options.protoPath).toHaveLength(2);
  });

  it('appends the grpc proto/package to the current protos/package list', () => {
    const options: GrpcOptions = {
      transport: Transport.GRPC,
      options: {
        protoPath: 'test.proto',
        package: 'test',
      },
    };

    const converted = addReflectionToGrpcConfig(options);
    expect(converted.options.package).toHaveLength(2);
    expect(converted.options.protoPath).toHaveLength(2);
  });
});
