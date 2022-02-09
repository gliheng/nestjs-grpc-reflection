import * as protoLoader from '@grpc/proto-loader';
import { Controller, Inject, OnModuleInit } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';

import { protobufPackage, ServerReflectionController, ServerReflectionControllerMethods, ServerReflectionRequest, ServerReflectionResponse } from './proto/grpc/reflection/v1alpha/reflection';

export const GRPC_CONFIG_PROVIDER_TOKEN = 'GRPC_CONFIG_OPTIONS';

/** Implements the gRPC Reflection API spec
 *
 * @see {@link https://github.com/grpc/grpc/blob/master/doc/server-reflection.md}
 */
@Controller(protobufPackage)
@ServerReflectionControllerMethods()
export class GrpcReflectionController implements OnModuleInit, ServerReflectionController {

  private index: Record<string, string[]> = {};

  constructor(@Inject(GRPC_CONFIG_PROVIDER_TOKEN) private readonly grpcConfig: GrpcOptions) {}

  async onModuleInit() {
    const { protoPath, loader } = this.grpcConfig.options;
    const protoFiles = Array.isArray(protoPath) ? protoPath : [protoPath];

    this.index = Object.fromEntries(protoFiles.map((file => {
      const packageDefinition = protoLoader.loadSync(file, loader);

      const services = Object.entries(packageDefinition).map(([objName, obj]) => {
        // Message Types
        if (obj.format === 'Protocol Buffer 3 DescriptorProto') {
          return null;
        }

        // Enum Types
        if (obj.format === 'Protocol Buffer 3 EnumDescriptorProto') {
          return null
        }

        return objName;
      }).filter(str => !!str);

      return [file, services];
    })));

    console.log(this.index);
  }

  serverReflectionInfo(request$: Observable<ServerReflectionRequest>): Observable<ServerReflectionResponse> {
    const response$ = new Subject<ServerReflectionResponse>();

    const onComplete = () => response$.complete();
    const onNext = (message: ServerReflectionRequest): void => {

    };

    request$.subscribe({
      next: onNext,
      complete: onComplete
    });

    return response$.asObservable();
  }
}
