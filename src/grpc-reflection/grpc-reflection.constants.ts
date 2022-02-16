import { join } from 'path';

import { protobufPackage } from './proto/grpc/reflection/v1alpha/reflection';

export const REFLECTION_PROTO = join(__dirname, './proto/grpc/reflection/v1alpha/reflection.proto');
export const REFLECTION_PACKAGE = protobufPackage;

export const GRPC_CONFIG_PROVIDER_TOKEN = 'GRPC_CONFIG_OPTIONS';
