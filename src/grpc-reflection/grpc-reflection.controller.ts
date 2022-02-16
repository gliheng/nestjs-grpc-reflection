import * as fs from 'fs';
import * as path from 'path';
import { Observable, Subject } from 'rxjs';
import { objectToCamel, objectToSnake } from 'ts-case-convert';

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
  symbols: string[];
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

    this.index = Object.fromEntries(protoFiles.filter(f => f != REFLECTION_PROTO).map((file => {
      const packageDefinition = protoLoader.loadSync(file, loader);

      const services = Object.entries(packageDefinition).map(([objName, obj]) => {
        // Message Types
        if (obj.format === 'Protocol Buffer 3 DescriptorProto') {
          return null; // obj.type.name
        }

        // Enum Types
        if (obj.format === 'Protocol Buffer 3 EnumDescriptorProto') {
          return null;
        }

        return objName;
      }).filter(str => !!str);

      const symbols = Object.entries(packageDefinition).map(([objName, obj]) => {
        // Message Types
        if (obj.format === 'Protocol Buffer 3 DescriptorProto') {
          return obj.type['name'];
        }

        // Enum Types
        if (obj.format === 'Protocol Buffer 3 EnumDescriptorProto') {
          return obj.type['name'];
        }

        return objName;
      }).filter(str => !!str);

      return [path.basename(file), {
        path: file,
        name: path.basename(file),
        services,
        symbols
      }];
    })));

    console.log(this.index);
  }

  serverReflectionInfo(request$: Observable<ServerReflectionRequest>): Observable<ServerReflectionResponse> {
    const response$ = new Subject<ServerReflectionResponse>();

    const onComplete = () => response$.complete();
    const onNext = (rawMsg: ServerReflectionRequest): void => {

      /* Convert the message keys from snake_case to camelCase to deal with proto-loader's "keepCase" option. This is
       * necessary because this module will be loaded into someone else's gRPC environment which we don't have control
       * over. If they've set keepCase to 'true' then we should convert it anyways for ourselves for consistency. */
      const message = this.grpcConfig.options.loader.keepCase ? objectToCamel(rawMsg) : rawMsg;

      if (message.listServices) {
        const services = Object.values(this.index).map(({ services }) => services).flat();
        const response = {
          validHost: message.host,
          originalRequest: message,
          listServicesResponse: {
            service: services.map(name => ({ name }))
          },
          fileDescriptorResponse: undefined,
          allExtensionNumbersResponse: undefined,
          errorResponse: undefined
        };
        response$.next(this.grpcConfig.options.loader.keepCase ? objectToSnake(response) as any as ServerReflectionResponse : response);
      }

      if (message.fileContainingSymbol) {
        const protoFile = Object.values(this.index).find(({ symbols }) => symbols.includes(message.fileContainingSymbol));
        if (protoFile) {
          const response = {
            validHost: message.host,
            originalRequest: message,
            fileDescriptorResponse: {
              fileDescriptorProto: [fs.readFileSync(protoFile.path)]
            },
            allExtensionNumbersResponse: undefined,
            listServicesResponse: undefined,
            errorResponse: undefined
          };
          response$.next(this.grpcConfig.options.loader.keepCase ? objectToSnake(response) as any as ServerReflectionResponse : response);
        } else {
          const response = {
            validHost: message.host,
            originalRequest: message,
            fileDescriptorResponse: undefined,
            allExtensionNumbersResponse: undefined,
            listServicesResponse: undefined,
            errorResponse: {
              errorCode: grpc.status.NOT_FOUND,
              errorMessage: `Proto file not found: ${message.fileByFilename}`
            }
          };
          response$.next(this.grpcConfig.options.loader.keepCase ? objectToSnake(response) as any as ServerReflectionResponse : response);
        }
      }

      if (message.fileByFilename) {
        const protoFile = Object.values(this.index).find(({ name }) => name === message.fileByFilename);
        if (protoFile) {
          const response = {
            validHost: message.host,
            originalRequest: message,
            fileDescriptorResponse: {
              fileDescriptorProto: [fs.readFileSync(protoFile.path)]
            },
            allExtensionNumbersResponse: undefined,
            listServicesResponse: undefined,
            errorResponse: undefined
          };
          response$.next(this.grpcConfig.options.loader.keepCase ? objectToSnake(response) as any as ServerReflectionResponse : response);
        }
        else {
          const response = {
            validHost: message.host,
            originalRequest: message,
            fileDescriptorResponse: undefined,
            allExtensionNumbersResponse: undefined,
            listServicesResponse: undefined,
            errorResponse: {
              errorCode: grpc.status.NOT_FOUND,
              errorMessage: `Proto file not found: ${message.fileByFilename}`
            }
          };
          response$.next(this.grpcConfig.options.loader.keepCase ? objectToSnake(response) as any as ServerReflectionResponse : response);
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
