import { Observable, Subject } from 'rxjs';
import { objectToCamel, objectToSnake } from 'ts-case-convert';

import * as grpc from '@grpc/grpc-js';
import { Controller, Inject } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';

import {
  protobufPackage,
  ServerReflectionController,
  ServerReflectionControllerMethods,
  ServerReflectionRequest,
  ServerReflectionResponse,
} from './proto/grpc/reflection/v1alpha/reflection';
import {
  GrpcReflectionService,
  ReflectionError,
} from './grpc-reflection.service';
import { GRPC_CONFIG_PROVIDER_TOKEN } from './grpc-reflection.constants';

/** Implements the gRPC Reflection API spec
 *
 * @see {@link https://github.com/grpc/grpc/blob/master/doc/server-reflection.md}
 */
@Controller(protobufPackage)
@ServerReflectionControllerMethods()
export class GrpcReflectionController implements ServerReflectionController {
  constructor(
    @Inject(GRPC_CONFIG_PROVIDER_TOKEN)
    private readonly grpcConfig: GrpcOptions,
    private readonly grpcReflectionService: GrpcReflectionService,
  ) {}

  serverReflectionInfo(
    request$: Observable<ServerReflectionRequest>,
  ): Observable<ServerReflectionResponse> {
    const response$ = new Subject<ServerReflectionResponse>();

    const onComplete = () => response$.complete();
    const onNext = (rawMsg: ServerReflectionRequest): void => {
      /* Convert the message keys from snake_case to camelCase to deal with proto-loader's "keepCase" option. This is
       * necessary because this module will be loaded into someone else's gRPC environment which we don't have control
       * over. If they've set keepCase to 'true' then we should convert it anyways for ourselves for consistency. */
      const message = this.grpcConfig.options.loader?.keepCase
        ? objectToCamel(rawMsg)
        : rawMsg;

      const response: ServerReflectionResponse = {
        validHost: message.host,
        originalRequest: message,
        fileDescriptorResponse: undefined,
        allExtensionNumbersResponse: undefined,
        listServicesResponse: undefined,
        errorResponse: undefined,
      };

      try {
        if (message.listServices) {
          response.listServicesResponse =
            this.grpcReflectionService.listServices(message.listServices);
        } else if (message.fileContainingSymbol) {
          response.fileDescriptorResponse =
            this.grpcReflectionService.fileContainingSymbol(
              message.fileContainingSymbol,
            );
        } else if (message.fileByFilename) {
          response.fileDescriptorResponse =
            this.grpcReflectionService.fileByFilename(message.fileByFilename);
        } else {
          throw new ReflectionError(
            grpc.status.UNIMPLEMENTED,
            `Unimplemented method for request: ${message}`,
          );
        }
      } catch (e) {
        if (e instanceof ReflectionError) {
          response.errorResponse = {
            errorCode: e.statusCode,
            errorMessage: e.message,
          };
        } else {
          response.errorResponse = {
            errorCode: grpc.status.UNKNOWN,
            errorMessage:
              'Failed to process gRPC reflection request: unknown error',
          };
        }
      }

      /** Similar to above, we need to handle 'keepCase' as part of the server response as well */
      response$.next(
        this.grpcConfig.options.loader?.keepCase
          ? (objectToSnake(response) as any as ServerReflectionResponse)
          : response,
      );
    };

    request$.subscribe({
      next: onNext,
      complete: onComplete,
    });

    return response$.asObservable();
  }
}
