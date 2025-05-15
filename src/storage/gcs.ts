import type { StorageProvider } from "./index"
import fs from "fs"
import path from "path"
import { createLogger } from "../utils/logger"
import { Storage } from "@google-cloud/storage"

const logger = createLogger("gcs-storage")

export class GCSStorageProvider implements StorageProvider {
  private storage: Storage
  private bucket: string
  private prefix = "backups/"

  async initialize(config: any): Promise<void> {
    this.bucket = config.bucket

    if (config.prefix) {
      this.prefix = config.prefix
      // Ensure prefix ends with a slash
      if (!this.prefix.endsWith("/")) {
        this.prefix += "/"
      }
    }

    this.storage = new Storage({
      projectId: config.projectId,
      credentials: {
        client_email: config.key,
        private_key: config.secret,
      },
    })

    logger.info(`Initialized GCS storage provider: ${this.bucket}/${this.prefix}`)
  }

  async store(filePath: string, fileName: string): Promise<string> {
    const destination = `${this.prefix}${fileName}`

    // Upload the file to GCS
    await this.storage.bucket(this.bucket).upload(filePath, {
      destination,
      gzip: true,
    })

    logger.info(`Stored file in GCS: ${this.bucket}/${destination}`, {
      source: filePath,
      bucket: this.bucket,
      destination,
    })

    return destination
  }

  async retrieve(remotePath: string, localPath: string): Promise<string> {
    // If remotePath doesn't include the prefix, add it
    const source = remotePath.startsWith(this.prefix) ? remotePath : `${this.prefix}${remotePath}`

    // Create the directory if it doesn't exist
    const localDir = path.dirname(localPath)
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true })
    }

    // Download the file from GCS
    await this.storage.bucket(this.bucket).file(source).download({
      destination: localPath,
    })

    logger.info(`Retrieved file from GCS: ${localPath}`, {
      source: `${this.bucket}/${source}`,
      destination: localPath,
    })

    return localPath
  }

  async list(): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    // List all objects in the bucket with the prefix
    const [files] = await this.storage.bucket(this.bucket).getFiles({
      prefix: this.prefix,
    })

    if (!files || files.length === 0) {
      return []
    }

    // Get file details
    const fileDetailsPromises = files
      .filter((file) => file.name !== this.prefix) // Filter out the prefix itself
      .map(async (file) => {
        const [metadata] = await file.getMetadata()
        const name = file.name.replace(this.prefix, "")

        return {
          name,
          size: Number.parseInt(metadata.size),
          lastModified: new Date(metadata.updated),
        }
      })

    const fileDetails = await Promise.all(fileDetailsPromises)

    // Sort by last modified date (newest first)
    fileDetails.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())

    logger.info(`Listed ${fileDetails.length} files from GCS storage`)

    return fileDetails
  }
}
