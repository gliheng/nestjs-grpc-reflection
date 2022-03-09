## Description

A pluggable [gRPC Reflection Server](https://github.com/grpc/grpc/blob/master/doc/server-reflection.md) for the excellent [NestJS](https://github.com/nestjs/nest) framework.

Adding this module to your existing NestJS-based gRPC microservice will allow clients [such as postman](https://blog.postman.com/postman-now-supports-grpc/) to dynamically load your API definitions from your running application rather than needing to load each proto file manually.

![example of reflection working with postman](https://gitlab.com/jtimmons/nestjs-grpc-reflection-module/-/raw/master/images/example.gif)

## Getting Started

To get started, first install the package:

```bash
$ npm install nestjs-grpc-reflection
```

Then simply register the `GrpcReflectionModule` from the root module of your application - it takes in the same `GrpcOptions` that are used to create your microservice. The gRPC Reflection Server module runs within your application's existing gRPC server just as any other controller in your microservice, so loading the module will add the appropriate routes to your application.

```ts
import { GrpcReflectionModule } from 'nestjs-grpc-reflection';
...
@Module({
  imports: [GrpcReflectionModule.register(grpcClientOptions)],
  ...
})
export class AppModule {}
```

Finally, NestJS needs to know where the reflection proto files are so that it can serialize/deserialize its message traffic. For convenience, this can be automatically added to your `GrpcOptions` using the `addReflectionToGrpcConfig` function like so:

```ts
import { addReflectionToGrpcConfig } from 'nestjs-grpc-reflection';
...
export const grpcClientOptions: GrpcOptions = addReflectionToGrpcConfig({
  transport: Transport.GRPC,
  options: {
    package: 'sample',
    protoPath: join(__dirname, 'sample/proto/sample.proto'),
  },
});
```

Alternatively, these paths can be added manually by appending the `REFLECTION_PACKAGE` and `REFLECTION_PROTO` constants to the `package` and `protoPath` lists respectively.

> :warning: **If you are using [@grpc/proto-loader's `keepCase` option](https://github.com/grpc/grpc-node/blob/master/packages/proto-loader/README.md) you may experience some issues with the server reflection API**. This module assumes that the microservice server is running with `keepCase` off (the NestJS default) and will attempt to convert *back* to the original case if it's on but this may not be perfect in all cases.

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
