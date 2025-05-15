import { getDatabaseConnector } from "../connectors"
import { createLogger } from "../utils/logger"

const logger = createLogger("test-connection")

export async function testConnection(options: any) {
  logger.info(`Testing connection to ${options.database} (${options.type})`, {
    databaseType: options.type,
    databaseName: options.database,
    host: options.host,
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

    // Test the connection
    await connector.testConnection()

    // Disconnect from the database
    await connector.disconnect()

    logger.info(`Connection successful to ${options.database} (${options.type})`, {
      databaseType: options.type,
      databaseName: options.database,
    })

    console.log(`✅ Connection successful to ${options.database} (${options.type})`)
  } catch (error) {
    logger.error(`Connection failed: ${error.message}`, {
      databaseType: options.type,
      databaseName: options.database,
      error: error.stack,
    })

    console.error(`❌ Connection failed: ${error.message}`)
    process.exit(1)
  }
}
