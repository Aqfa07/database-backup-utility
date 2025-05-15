import type { StorageProvider } from "./index"
import fs from "fs"
import path from "path"
import { createLogger } from "../utils/logger"
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { createReadStream, createWriteStream } from "fs"

const logger = createLogger("s3-storage")

export class S3StorageProvider implements StorageProvider {
  private client: S3Client
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

    this.client = new S3Client({
      region: config.region || "us-east-1",
      credentials: {
        accessKeyId: config.key,
        secretAccessKey: config.secret,
      },
    })

    logger.info(`Initialized S3 storage provider: ${this.bucket}/${this.prefix}`)
  }

  async store(filePath: string, fileName: string): Promise<string> {
    const key = `${this.prefix}${fileName}`

    // Upload the file to S3
    const fileStream = createReadStream(filePath)

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
      }),
    )

    logger.info(`Stored file in S3: ${this.bucket}/${key}`, {
      source: filePath,
      bucket: this.bucket,
      key: key,
    })

    return key
  }

  async retrieve(remotePath: string, localPath: string): Promise<string> {
    // If remotePath doesn't include the prefix, add it
    const key = remotePath.startsWith(this.prefix) ? remotePath : `${this.prefix}${remotePath}`

    // Create the directory if it doesn't exist
    const localDir = path.dirname(localPath)
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true })
    }

    // Download the file from S3
    const { Body } = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    )

    // Write the file to the local path
    const writeStream = createWriteStream(localPath)

    // @ts-ignore - Body is a Readable stream
    await new Promise((resolve, reject) => {
      // @ts-ignore - Body is a Readable stream
      Body.pipe(writeStream).on("error", reject).on("finish", resolve)
    })

    logger.info(`Retrieved file from S3: ${localPath}`, {
      source: `${this.bucket}/${key}`,
      destination: localPath,
    })

    return localPath
  }

  async list(): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    // List all objects in the bucket with the prefix
    const { Contents } = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.prefix,
      }),
    )

    if (!Contents || Contents.length === 0) {
      return []
    }

    // Get file details
    const fileDetails = Contents.filter((item) => item.Key !== this.prefix) // Filter out the prefix itself
      .map((item) => {
        const name = item.Key.replace(this.prefix, "")

        return {
          name,
          size: item.Size,
          lastModified: item.LastModified,
        }
      })

    // Sort by last modified date (newest first)
    fileDetails.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())

    logger.info(`Listed ${fileDetails.length} files from S3 storage`)

    return fileDetails
  }
}
