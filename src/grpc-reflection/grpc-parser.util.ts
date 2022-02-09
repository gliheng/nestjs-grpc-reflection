import { GrpcObject } from "@grpc/grpc-js";

const isGrpcObject = (obj: GrpcObject[string]): obj is GrpcObject => !('type' in obj) && !('service' in obj);

/** Recursively parse gRPC definitions pulled from the proto file */
export const parseGrpcObject = (parent: GrpcObject) => {
  return Object.entries(parent).map(([pkgName, child]) => {
    if (isGrpcObject(child)) {
      return parseGrpcObject(child);
    }

    if ('type' in child) {
      child
    }
  });
}
