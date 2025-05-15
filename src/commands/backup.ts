import { createLogger } from "../utils/logger"
import { getDatabaseConnector } from "../connectors"
import { getStorageProvider } from "../storage"
import { compressFile } from "../utils/compression"
import { sendNotification } from "../utils/notification"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"

const logger = createLogger("backup")

export async function backupDatabase(options: any) {
  const startTime = new Date()
  const backupId = uuidv4()

  logger.info(`Starting ${options.backupType} backup of ${options.database} (${options.type})`, {
    backupId,
    databaseType: options.type,
    databaseName: options.database,
    backupType: options.backupType,
  })

  try {
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

    // Create output directory if it doesn't exist
    if (!fs.existsSync(options.output)) {
      fs.mkdirSync(options.output, { recursive: true })
    }

    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupFilename = `${options.database}_${options.backupType}_${timestamp}.${connector.getFileExtension()}`
    const backupPath = path.join(options.output, backupFilename)

    // Perform the backup
    await connector.backup({
      outputPath: backupPath,
      backupType: options.backupType,
    })

    // Compress the backup if requested
    let finalBackupPath = backupPath
    if (options.compress) {
      finalBackupPath = await compressFile(backupPath)
      // Remove the original uncompressed file
      fs.unlinkSync(backupPath)
      logger.info(`Backup compressed: ${finalBackupPath}`, { backupId })
    }

    // Store the backup
    const storageProvider = getStorageProvider(options.storage)
    await storageProvider.initialize({
      key: options.cloudKey,
      secret: options.cloudSecret,
      bucket: options.cloudBucket,
      region: options.cloudRegion,
    })

    const storageLocation = await storageProvider.store(finalBackupPath, path.basename(finalBackupPath))

    // Calculate time taken
    const endTime = new Date()
    const timeTaken = (endTime.getTime() - startTime.getTime()) / 1000

    // Log success
    logger.info(`Backup completed successfully in ${timeTaken}s: ${storageLocation}`, {
      backupId,
      timeTaken,
      storageLocation,
    })

    // Send notification if requested
    if (options.notify) {
      await sendNotification({
        subject: `Backup Completed: ${options.database}`,
        message: `${options.backupType} backup of ${options.database} (${options.type}) completed successfully in ${timeTaken}s.\nStorage location: ${storageLocation}`,
      })
    }

    // Disconnect from the database
    await connector.disconnect()

    console.log(`Backup completed successfully: ${storageLocation}`)
  } catch (error) {
    logger.error(`Backup failed: ${error.message}`, {
      backupId,
      error: error.stack,
    })

    if (options.notify) {
      await sendNotification({
        subject: `Backup Failed: ${options.database}`,
        message: `${options.backupType} backup of ${options.database} (${options.type}) failed: ${error.message}`,
      })
    }

    console.error(`Backup failed: ${error.message}`)
    process.exit(1)
  }
}
