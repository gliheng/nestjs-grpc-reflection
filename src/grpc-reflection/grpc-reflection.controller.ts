import * as fs from 'fs';
import * as path from 'path';
import { Observable, Subject } from 'rxjs';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Controller, Inject, OnModuleInit } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';

import { REFLECTION_PROTO } from './grpc-reflection.constants';
import { protobufPackage, ServerReflectionController, ServerReflectionControllerMethods, ServerReflectionRequest, ServerReflectionResponse } from './proto/grpc/reflection/v1alpha/reflection';

export const GRPC_CONFIG_PROVIDER_TOKEN = 'GRPC_CONFIG_OPTIONS';

interface ProtoFileData {
  path: string;
  name: string;
  services: string[];
}

type ProtoIndex = Record<string, ProtoFileData>;

/** Implements the gRPC Reflection API spec
 *
 * @see {@link https://github.com/grpc/grpc/blob/master/doc/server-reflection.md}
 */
@Controller(protobufPackage)
@ServerReflectionControllerMethods()
export class GrpcReflectionController implements OnModuleInit, ServerReflectionController {

  private index: ProtoIndex = {};

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

      return [path.basename(file), {
        path: file,
        name: path.basename(file),
        services
      }];
    })));

    console.log(this.index);
  }

  serverReflectionInfo(request$: Observable<ServerReflectionRequest>): Observable<ServerReflectionResponse> {
    const response$ = new Subject<ServerReflectionResponse>();

    const onComplete = () => response$.complete();
    const onNext = (message: ServerReflectionRequest): void => {
      if (message.fileByFilename) {
        const protoFile = Object.values(this.index).find(({ name }) => name === message.fileByFilename);
        if (protoFile) {
          response$.next({
            validHost: message.host,
            originalRequest: message,
            fileDescriptorResponse: {
              fileDescriptorProto: [fs.readFileSync(protoFile.path)]
            },
            allExtensionNumbersResponse: undefined,
            listServicesResponse: undefined,
            errorResponse: undefined
          });
        }
        else {
          response$.next({
            validHost: message.host,
            originalRequest: message,
            fileDescriptorResponse: undefined,
            allExtensionNumbersResponse: undefined,
            listServicesResponse: undefined,
            errorResponse: {
              errorCode: grpc.status.NOT_FOUND,
              errorMessage: `Proto file not found: ${message.fileByFilename}`
            }
          });
        }
      }
    };

    request$.subscribe({
      next: onNext,
      complete: onComplete
    });

    return response$.asObservable();
  }
}
