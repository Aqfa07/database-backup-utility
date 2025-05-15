#!/usr/bin/env node
import { Command } from "commander"
import chalk from "chalk"
import figlet from "figlet"
import { backupDatabase } from "./commands/backup"
import { restoreDatabase } from "./commands/restore"
import { testConnection } from "./commands/test-connection"
import { scheduleBackup } from "./commands/schedule"
import { listBackups } from "./commands/list"
import { configureSettings } from "./commands/configure"

// Display banner
console.log(chalk.green(figlet.textSync("DB Backup", { horizontalLayout: "full" })))

const program = new Command()

program.version("1.0.0").description("A database backup utility for multiple database types")

program
  .command("backup")
  .description("Backup a database")
  .option("-t, --type <type>", "Database type (mysql, postgres, mongodb, sqlite)", "postgres")
  .option("-h, --host <host>", "Database host", "localhost")
  .option("-p, --port <port>", "Database port")
  .option("-u, --user <user>", "Database username")
  .option("-pw, --password <password>", "Database password")
  .option("-d, --database <database>", "Database name")
  .option("-o, --output <path>", "Output directory for backup", "./backups")
  .option("-b, --backup-type <backupType>", "Backup type (full, incremental, differential)", "full")
  .option("-c, --compress", "Compress the backup", false)
  .option("-s, --storage <storage>", "Storage type (local, s3, gcs, azure)", "local")
  .option("--cloud-key <key>", "Cloud storage key")
  .option("--cloud-secret <secret>", "Cloud storage secret")
  .option("--cloud-bucket <bucket>", "Cloud storage bucket")
  .option("--cloud-region <region>", "Cloud storage region")
  .option("-n, --notify", "Send notification on completion", false)
  .action(backupDatabase)

program
  .command("restore")
  .description("Restore a database from backup")
  .option("-t, --type <type>", "Database type (mysql, postgres, mongodb, sqlite)", "postgres")
  .option("-h, --host <host>", "Database host", "localhost")
  .option("-p, --port <port>", "Database port")
  .option("-u, --user <user>", "Database username")
  .option("-pw, --password <password>", "Database password")
  .option("-d, --database <database>", "Database name")
  .option("-f, --file <file>", "Backup file to restore from")
  .option("-s, --storage <storage>", "Storage type (local, s3, gcs, azure)", "local")
  .option("--cloud-key <key>", "Cloud storage key")
  .option("--cloud-secret <secret>", "Cloud storage secret")
  .option("--cloud-bucket <bucket>", "Cloud storage bucket")
  .option("--cloud-region <region>", "Cloud storage region")
  .option("--selective <tables>", "Comma-separated list of tables to restore")
  .action(restoreDatabase)

program
  .command("test-connection")
  .description("Test database connection")
  .option("-t, --type <type>", "Database type (mysql, postgres, mongodb, sqlite)", "postgres")
  .option("-h, --host <host>", "Database host", "localhost")
  .option("-p, --port <port>", "Database port")
  .option("-u, --user <user>", "Database username")
  .option("-pw, --password <password>", "Database password")
  .option("-d, --database <database>", "Database name")
  .action(testConnection)

program
  .command("schedule")
  .description("Schedule a backup")
  .option("-t, --type <type>", "Database type (mysql, postgres, mongodb, sqlite)", "postgres")
  .option("-h, --host <host>", "Database host", "localhost")
  .option("-p, --port <port>", "Database port")
  .option("-u, --user <user>", "Database username")
  .option("-pw, --password <password>", "Database password")
  .option("-d, --database <database>", "Database name")
  .option("-o, --output <path>", "Output directory for backup", "./backups")
  .option("-c, --cron <expression>", "Cron expression for scheduling", "0 0 * * *")
  .option("-b, --backup-type <backupType>", "Backup type (full, incremental, differential)", "full")
  .option("--compress", "Compress the backup", false)
  .option("-s, --storage <storage>", "Storage type (local, s3, gcs, azure)", "local")
  .option("--cloud-key <key>", "Cloud storage key")
  .option("--cloud-secret <secret>", "Cloud storage secret")
  .option("--cloud-bucket <bucket>", "Cloud storage bucket")
  .option("--cloud-region <region>", "Cloud storage region")
  .option("-n, --notify", "Send notification on completion", false)
  .action(scheduleBackup)

program
  .command("list")
  .description("List available backups")
  .option("-s, --storage <storage>", "Storage type (local, s3, gcs, azure)", "local")
  .option("-o, --output <path>", "Backup directory", "./backups")
  .option("--cloud-key <key>", "Cloud storage key")
  .option("--cloud-secret <secret>", "Cloud storage secret")
  .option("--cloud-bucket <bucket>", "Cloud storage bucket")
  .option("--cloud-region <region>", "Cloud storage region")
  .action(listBackups)

program.command("configure").description("Configure default settings").action(configureSettings)

program.parse(process.argv)

// If no arguments, show help
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
