import { LocalStorageProvider } from "./local"
import { S3StorageProvider } from "./s3"
import { GCSStorageProvider } from "./gcs"
import { AzureStorageProvider } from "./azure"

export interface StorageProvider {
  initialize(config: any): Promise<void>
  store(filePath: string, fileName: string): Promise<string>
  retrieve(remotePath: string, localPath: string): Promise<string>
  list(): Promise<Array<{ name: string; size: number; lastModified: Date }>>
}

export function getStorageProvider(type: string): StorageProvider {
  switch (type.toLowerCase()) {
    case "local":
      return new LocalStorageProvider()
    case "s3":
      return new S3StorageProvider()
    case "gcs":
      return new GCSStorageProvider()
    case "azure":
      return new AzureStorageProvider()
    default:
      throw new Error(`Unsupported storage type: ${type}`)
  }
}
