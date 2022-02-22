import { GrpcOptions } from '@nestjs/microservices';

import {
  REFLECTION_PACKAGE,
  REFLECTION_PROTO,
} from './grpc-reflection.constants';

/** Adds gRPC reflection package and proto information to a NestJS GrpcOptions object
 *
 * This is intended to be used to inform NestJS of where to find the reflection proto file
 * and what package to look out for requests on
 */
export const addReflectionToGrpcConfig = (config: GrpcOptions): GrpcOptions => {
  const protoPath = Array.isArray(config.options.protoPath)
    ? config.options.protoPath
    : [config.options.protoPath];
  const pkg = Array.isArray(config.options.package)
    ? config.options.package
    : [config.options.package];

  return {
    ...config,
    options: {
      ...config.options,
      protoPath: [...protoPath, REFLECTION_PROTO],
      package: [...pkg, REFLECTION_PACKAGE],
    },
  };
};
