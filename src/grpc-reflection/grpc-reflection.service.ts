import { FileDescriptorProto, FileDescriptorSet } from 'google-protobuf/google/protobuf/descriptor_pb'

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';

import { GRPC_CONFIG_PROVIDER_TOKEN } from './grpc-reflection.constants';
import { FileDescriptorResponse, ListServiceResponse } from './proto/grpc/reflection/v1alpha/reflection';

export class ReflectionError extends Error {
  constructor(readonly statusCode: grpc.status, readonly message: string) {
    super(message);
  }
}

const isMessageDefinition = (def: protoLoader.AnyDefinition): def is protoLoader.MessageTypeDefinition => {
  return def.format === 'Protocol Buffer 3 DescriptorProto';
};

const isEnumDefinition = (def: protoLoader.AnyDefinition): def is protoLoader.EnumTypeDefinition => {
  return def.format === 'Protocol Buffer 3 EnumDescriptorProto';
};

const findSymbol = (symbolToFind: string, pkg: protoLoader.PackageDefinition): protoLoader.AnyDefinition | null => {
  // TODO: add support for looking up nested symbols https://developers.google.com/protocol-buffers/docs/proto3#nested
  const symbol = Object.entries(pkg).find(([name, _def]) => name === symbolToFind);
  return symbol ? symbol[1] : null;
};

@Injectable()
export class GrpcReflectionService implements OnModuleInit {
  private readonly logger = new Logger(GrpcReflectionService.name);

  private fileDescriptorSet = new FileDescriptorSet();
  private packageDefinitions: protoLoader.PackageDefinition[];

  constructor(@Inject(GRPC_CONFIG_PROVIDER_TOKEN) private readonly grpcConfig: GrpcOptions) {}

  async onModuleInit() {
    const { protoPath, loader } = this.grpcConfig.options;
    const protoFiles = Array.isArray(protoPath) ? protoPath : [protoPath];
    this.packageDefinitions = await Promise.all(protoFiles.map(file => protoLoader.load(file, loader)));

    // Build a FileDescriptorSet from all the files
    this.packageDefinitions.map(packageDefinition => {
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

  listServices(listServices: string): ListServiceResponse {
    this.logger.debug(`listServices called with filter ${listServices}`);
    const services = this.fileDescriptorSet
      .getFileList()
      .map(file => file.getServiceList().map(service => `${file.getPackage()}.${service.getName()}`))
      .flat();

    this.logger.debug(`listServices found services: ${services.join(', ')}`);
    return { service: services.map(service => ({ name: service })) };
  }

  fileContainingSymbol(symbol: string): FileDescriptorResponse {
    this.logger.debug(`fileContainingSymbol called for symbol ${symbol}`);
    const definition = this.packageDefinitions.map(pkg => findSymbol(symbol, pkg)).flat().find(result => !!result);

    if (!definition) {
      this.logger.error(`fileContainingSymbol failed to find symbol ${symbol}`);
      throw new ReflectionError(grpc.status.NOT_FOUND, `Symbol not found: ${symbol}`);
    }

    // Message and Enum types have their file descriptor protos attached to them already
    if (isMessageDefinition(definition) || isEnumDefinition(definition)) {
      const fileNames = definition.fileDescriptorProtos.map(f => FileDescriptorProto.deserializeBinary(f).getName());
      this.logger.debug(`fileContainingSymbol found files: ${fileNames.join(', ')}`);
      return { fileDescriptorProto: definition.fileDescriptorProtos };
    }

    // For ServiceDefinitions we need to loop through its MethodDefinition list and get the file descriptor protos
    // from the MessageDefinitions for the request and responses of those methods
    const fileDescriptorProtos = Object.entries(definition).map(([, method]) => [
      ...method.requestType.fileDescriptorProtos,
      ...method.responseType.fileDescriptorProtos
    ].map(bin => FileDescriptorProto.deserializeBinary(bin))).flat();

    const dedupedFileDescriptorProtos = Object.values(fileDescriptorProtos.reduce(
      (acc, proto) => ({ ...acc, [proto.getName()]: proto }),
      {} as Record<string, FileDescriptorProto>
    ));

    this.logger.debug(`fileContainingSymbol found files: ${dedupedFileDescriptorProtos.map(f => f.getName())}`);
    return { fileDescriptorProto: dedupedFileDescriptorProtos.map(f => f.serializeBinary()) };
  }

  fileByFilename(filename: string): FileDescriptorResponse {
    this.logger.debug(`fileByFilename called with filename ${filename}`);
    const fileDescriptorProtos = this.fileDescriptorSet.getFileList().filter(file => file.getName() === filename);

    if (fileDescriptorProtos.length === 0) {
      throw new ReflectionError(grpc.status.NOT_FOUND, `Proto file not found: ${filename}`);
    }

    return { fileDescriptorProto: fileDescriptorProtos.map(f => f.serializeBinary()) };
  }
}
