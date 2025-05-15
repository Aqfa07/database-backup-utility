import type { StorageProvider } from "./index"
import fs from "fs"
import path from "path"
import { createLogger } from "../utils/logger"

const logger = createLogger("local-storage")

export class LocalStorageProvider implements StorageProvider {
  private basePath = "./backups"

  async initialize(config: any): Promise<void> {
    if (config.basePath) {
      this.basePath = config.basePath
    }

    // Create the directory if it doesn't exist
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true })
    }

    logger.info(`Initialized local storage provider: ${this.basePath}`)
  }

  async store(filePath: string, fileName: string): Promise<string> {
    const destinationPath = path.join(this.basePath, fileName)

    // If the file is already in the destination, just return the path
    if (path.resolve(filePath) === path.resolve(destinationPath)) {
      return destinationPath
    }

    // Copy the file to the destination
    fs.copyFileSync(filePath, destinationPath)

    logger.info(`Stored file: ${destinationPath}`, {
      source: filePath,
      destination: destinationPath,
    })

    return destinationPath
  }

  async retrieve(remotePath: string, localPath: string): Promise<string> {
    const sourcePath = path.join(this.basePath, remotePath)

    // Create the directory if it doesn't exist
    const localDir = path.dirname(localPath)
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true })
    }

    // Copy the file to the local path
    fs.copyFileSync(sourcePath, localPath)

    logger.info(`Retrieved file: ${localPath}`, {
      source: sourcePath,
      destination: localPath,
    })

    return localPath
  }

  async list(): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    // Read all files in the directory
    const files = fs.readdirSync(this.basePath)

    // Get file details
    const fileDetails = files.map((file) => {
      const filePath = path.join(this.basePath, file)
      const stats = fs.statSync(filePath)

      return {
        name: file,
        size: stats.size,
        lastModified: stats.mtime,
      }
    })

    // Sort by last modified date (newest first)
    fileDetails.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())

    logger.info(`Listed ${fileDetails.length} files from local storage`)

    return fileDetails
  }
}
