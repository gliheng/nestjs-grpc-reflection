## Description

A pluggable [gRPC Reflection Server](https://github.com/grpc/grpc/blob/master/doc/server-reflection.md) for the excellent [NestJS](https://github.com/nestjs/nest) framework.

Adding this to your existing gRPC microservice will allow gRPC clients [such as postman](https://blog.postman.com/postman-now-supports-grpc/) to dynamically load your API definitions from your running application rather than needing to load each proto file manually.

## Getting Started

The gRPC Reflection Server module runs within your application's existing gRPC server just as any other controller in your microservice. To get started, simply register the `GrpcReflectionModule` from the root module of your application - it takes in the same `GrpcOptions` that are used to create your microservice:

```ts
import { GrpcReflectionModule } from '../grpc-reflection/grpc-reflection.module';
...
@Module({
  imports: [GrpcReflectionModule.register(grpcClientOptions)],
  ...
})
export class AppModule {}
```

Additionally, NestJS must know where the reflection proto files are so that it can serialize/deserialize its message traffic. For convenience these paths are exposed in the `REFLECTION_PACKAGE` and `REFLECTION_PROTO` constants: these should be added to your `GrpcOptions` config in the `package` and `protoPath` lists.

```ts
import { join } from 'path';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { REFLECTION_PACKAGE, REFLECTION_PROTO } from './grpc-reflection/grpc-reflection.constants';

export const grpcClientOptions: GrpcOptions = {
  transport: Transport.GRPC,
  options: {
    package: ['sample', REFLECTION_PACKAGE],
    protoPath: [
      join(__dirname, 'sample/proto/sample.proto'),
      REFLECTION_PROTO
    ]
  },
};
```

## Local Development

This repository contains a simple example gRPC service as well as the gRPC reflection module library, so new features can be tested against that service.

```bash
$ npm install
```

### Generating Types

This repo uses [ts-proto](https://github.com/stephenh/ts-proto/blob/main/NESTJS.markdown) for type generation. If any of the the reflection API proto files are changed, we'll need to regenerate the types to reflect that change. This relies on the `protoc` compiler, so if that's not installed already you'll need to do so first - instructions can be found on their site [here](https://grpc.io/docs/protoc-installation/).

```bash
$ npm run generate # regenerate reflection types, requires 'protoc' to be installed
```

### Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

### Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
