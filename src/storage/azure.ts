import type { StorageProvider } from "./index"
import fs from "fs"
import path from "path"
import { createLogger } from "../utils/logger"
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob"

const logger = createLogger("azure-storage")

export class AzureStorageProvider implements StorageProvider {
  private blobServiceClient: BlobServiceClient
  private containerName: string
  private prefix = "backups/"

  async initialize(config: any): Promise<void> {
    this.containerName = config.bucket

    if (config.prefix) {
      this.prefix = config.prefix
      // Ensure prefix ends with a slash
      if (!this.prefix.endsWith("/")) {
        this.prefix += "/"
      }
    }

    // Create a shared key credential
    const sharedKeyCredential = new StorageSharedKeyCredential(config.key, config.secret)

    // Create the BlobServiceClient
    this.blobServiceClient = new BlobServiceClient(`https://${config.key}.blob.core.windows.net`, sharedKeyCredential)

    // Ensure the container exists
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
    await containerClient.createIfNotExists()

    logger.info(`Initialized Azure storage provider: ${this.containerName}/${this.prefix}`)
  }

  async store(filePath: string, fileName: string): Promise<string> {
    const blobName = `${this.prefix}${fileName}`

    // Get a reference to a container
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName)

    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    // Upload the file
    await blockBlobClient.uploadFile(filePath)

    logger.info(`Stored file in Azure: ${this.containerName}/${blobName}`, {
      source: filePath,
      container: this.containerName,
      blobName,
    })

    return blobName
  }

  async retrieve(remotePath: string, localPath: string): Promise<string> {
    // If remotePath doesn't include the prefix, add it
    const blobName = remotePath.startsWith(this.prefix) ? remotePath : `${this.prefix}${remotePath}`

    // Create the directory if it doesn't exist
    const localDir = path.dirname(localPath)
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true })
    }

    // Get a reference to a container
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName)

    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    // Download the blob to a file
    await blockBlobClient.downloadToFile(localPath)

    logger.info(`Retrieved file from Azure: ${localPath}`, {
      source: `${this.containerName}/${blobName}`,
      destination: localPath,
    })

    return localPath
  }

  async list(): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    // Get a reference to a container
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName)

    // List all blobs in the container with the prefix
    const blobs = []
    for await (const blob of containerClient.listBlobsFlat({ prefix: this.prefix })) {
      blobs.push(blob)
    }

    if (blobs.length === 0) {
      return []
    }

    // Get file details
    const fileDetails = blobs
      .filter((blob) => blob.name !== this.prefix) // Filter out the prefix itself
      .map((blob) => {
        const name = blob.name.replace(this.prefix, "")

        return {
          name,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified,
        }
      })

    // Sort by last modified date (newest first)
    fileDetails.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())

    logger.info(`Listed ${fileDetails.length} files from Azure storage`)

    return fileDetails
  }
}
