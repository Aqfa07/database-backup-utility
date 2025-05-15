import { createLogger } from "../utils/logger"
import { getDatabaseConnector } from "../connectors"
import { getStorageProvider } from "../storage"
import { decompressFile } from "../utils/compression"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import os from "os"

const logger = createLogger("restore")

export async function restoreDatabase(options: any) {
  const startTime = new Date()
  const restoreId = uuidv4()

  logger.info(`Starting restore of ${options.database} (${options.type})`, {
    restoreId,
    databaseType: options.type,
    databaseName: options.database,
    backupFile: options.file,
  })

  const tempDir = path.join(os.tmpdir(), `db-backup-restore-${restoreId}`)
  let localBackupPath = ""

  try {
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true })

    // Get the storage provider
    const storageProvider = getStorageProvider(options.storage)
    await storageProvider.initialize({
      key: options.cloudKey,
      secret: options.cloudSecret,
      bucket: options.cloudBucket,
      region: options.cloudRegion,
    })

    // Download the backup file if it's not local
    if (options.storage !== "local") {
      localBackupPath = path.join(tempDir, path.basename(options.file))
      await storageProvider.retrieve(options.file, localBackupPath)
      logger.info(`Downloaded backup file to ${localBackupPath}`, { restoreId })
    } else {
      localBackupPath = options.file
    }

    // Decompress the file if it's compressed
    if (localBackupPath.endsWith(".gz") || localBackupPath.endsWith(".zip")) {
      const decompressedPath = await decompressFile(localBackupPath, tempDir)
      logger.info(`Decompressed backup file to ${decompressedPath}`, { restoreId })
      localBackupPath = decompressedPath
    }

    // Get the appropriate database connector
    const connector = getDatabaseConnector(options.type)

    // Connect to the database
    await connector.connect({
      host: options.host,
      port: options.port,
      user: options.user,
      password: options.password,
      database: options.database,
    })

    // Perform the restore
    await connector.restore({
      inputPath: localBackupPath,
      selectiveTables: options.selective ? options.selective.split(",") : undefined,
    })

    // Calculate time taken
    const endTime = new Date()
    const timeTaken = (endTime.getTime() - startTime.getTime()) / 1000

    // Log success
    logger.info(`Restore completed successfully in ${timeTaken}s`, {
      restoreId,
      timeTaken,
    })

    // Disconnect from the database
    await connector.disconnect()

    console.log(`Restore completed successfully in ${timeTaken}s`)
  } catch (error) {
    logger.error(`Restore failed: ${error.message}`, {
      restoreId,
      error: error.stack,
    })

    console.error(`Restore failed: ${error.message}`)
    process.exit(1)
  } finally {
    // Clean up temp directory if it was created
    if (fs.existsSync(tempDir) && options.storage !== "local") {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  }
}
