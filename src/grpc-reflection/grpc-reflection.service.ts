import * as fs from 'fs';
import * as path from 'path';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { GrpcOptions } from '@nestjs/microservices';

import { GRPC_CONFIG_PROVIDER_TOKEN, REFLECTION_PROTO } from './grpc-reflection.constants';
import { FileDescriptorResponse, ListServiceResponse } from './proto/grpc/reflection/v1alpha/reflection';

export class ReflectionError extends Error {
  constructor(readonly statusCode: grpc.status, readonly message: string) {
    super(message);
  }
}

interface ProtoFileData {
  path: string;
  name: string;
  services: string[];
  symbols: string[];
}

type ProtoIndex = Record<string, ProtoFileData>;

@Injectable()
export class GrpcReflectionService implements OnModuleInit {

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

  listServices(_listServices: string): ListServiceResponse {
    const services = Object.values(this.index).map(({ services }) => services).flat();
    return { service: services.map(name => ({ name })) };
  }

  fileContainingSymbol(symbol: string): FileDescriptorResponse {
    const protoFile = Object.values(this.index).find(({ symbols }) => symbols.includes(symbol));
    if (!protoFile) {
      throw new ReflectionError(grpc.status.NOT_FOUND, `Symbol not found: ${symbol}`);
    }
    return { fileDescriptorProto: [fs.readFileSync(protoFile.path)] };
  }

  fileByFilename(filename: string): FileDescriptorResponse {
    const protoFile = Object.values(this.index).find(({ name }) => name === filename);

    if (!protoFile) {
      throw new ReflectionError(grpc.status.NOT_FOUND, `Proto file not found: ${filename}`);
    }

    return { fileDescriptorProto: [fs.readFileSync(protoFile.path)] };
  }
}
