import { FileDescriptorProto, FileDescriptorSet } from 'google-protobuf/google/protobuf/descriptor_pb'

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';

import { GRPC_CONFIG_PROVIDER_TOKEN } from './grpc-reflection.constants';
import { FileDescriptorResponse, ListServiceResponse } from './proto/grpc/reflection/v1alpha/reflection';

export class ReflectionError extends Error {
  constructor(readonly statusCode: grpc.status, readonly message: string) {
    super(message);
  }
}

@Injectable()
export class GrpcReflectionService implements OnModuleInit {

  private fileDescriptorSet = new FileDescriptorSet();

  constructor(@Inject(GRPC_CONFIG_PROVIDER_TOKEN) private readonly grpcConfig: GrpcOptions) {}

  async onModuleInit() {
    const { protoPath, loader } = this.grpcConfig.options;
    const protoFiles = Array.isArray(protoPath) ? protoPath : [protoPath];

    // Build a FileDescriptorSet from all the files
    protoFiles.forEach(file => {
      const packageDefinition = protoLoader.loadSync(file, loader);
      Object.values(packageDefinition).forEach(({ fileDescriptorProtos }) => {
        // Add file descriptors to the FileDescriptorSet.
        // We use the Array check here because a ServiceDefinition could have a method named the same thing
        if (Array.isArray(fileDescriptorProtos)) {
          fileDescriptorProtos.forEach(bin => {
            const proto = FileDescriptorProto.deserializeBinary(bin);
            const isFileInSet = this.fileDescriptorSet.getFileList().map(f => f.getName()).includes(proto.getName());
            if (!isFileInSet) {
              this.fileDescriptorSet.addFile(proto);
            }
          });
        }
      })
    });
  }

  listServices(_listServices: string): ListServiceResponse {
    const services = this.fileDescriptorSet
      .getFileList()
      .map(file => file.getServiceList().map(service => `${file.getPackage()}.${service.getName()}`))
      .flat();

    return { service: services.map(service => ({ name: service })) };
  }

  fileContainingSymbol(symbol: string): FileDescriptorResponse {
    const filesWithSymbol = this.fileDescriptorSet
      .getFileList()
      .filter(file => {
        const symbols = [
          ...file.getServiceList(),
          ...file.getMessageTypeList(),
          ...file.getEnumTypeList()
        ].map(symbol => `${file.getPackage()}.${symbol.getName()}`);

        return symbols.includes(symbol);
      });

    if (!filesWithSymbol) {
      throw new ReflectionError(grpc.status.NOT_FOUND, `Symbol not found: ${symbol}`);
    }

    return { fileDescriptorProto: filesWithSymbol.map(f => f.serializeBinary()) };
  }

  fileByFilename(filename: string): FileDescriptorResponse {
    const fileDescriptorProtos = this.fileDescriptorSet.getFileList().filter(file => file.getName() === filename);

    if (fileDescriptorProtos.length === 0) {
      throw new ReflectionError(grpc.status.NOT_FOUND, `Proto file not found: ${filename}`);
    }

    return { fileDescriptorProto: fileDescriptorProtos.map(f => f.serializeBinary()) };
  }
}
