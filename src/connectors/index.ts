import { PostgresConnector } from "./postgres"
import { MySQLConnector } from "./mysql"
import { MongoDBConnector } from "./mongodb"
import { SQLiteConnector } from "./sqlite"

export interface DatabaseConnector {
  connect(config: any): Promise<void>
  disconnect(): Promise<void>
  testConnection(): Promise<boolean>
  backup(options: any): Promise<string>
  restore(options: any): Promise<void>
  getFileExtension(): string
}

export function getDatabaseConnector(type: string): DatabaseConnector {
  switch (type.toLowerCase()) {
    case "postgres":
      return new PostgresConnector()
    case "mysql":
      return new MySQLConnector()
    case "mongodb":
      return new MongoDBConnector()
    case "sqlite":
      return new SQLiteConnector()
    default:
      throw new Error(`Unsupported database type: ${type}`)
  }
}
