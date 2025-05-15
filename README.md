# Database Backup Utility

A comprehensive command-line utility for backing up and restoring various types of databases.

## Features

- Support for multiple database types:
  - PostgreSQL
  - MySQL
  - MongoDB
  - SQLite
- Backup operations:
  - Full backups
  - Incremental backups (where supported)
  - Differential backups (where supported)
- Compression of backup files
- Multiple storage options:
  - Local storage
  - AWS S3
  - Google Cloud Storage
  - Azure Blob Storage
- Scheduled backups
- Detailed logging
- Slack notifications
- Restore operations with selective table/collection restore

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/yourusername/db-backup-utility.git
cd db-backup-utility

# Install dependencies
npm install

# Build the project
npm run build

# Link the CLI globally
npm link
\`\`\`

## Usage

### Configuration

Set up default configuration:

\`\`\`bash
db-backup configure
\`\`\`

### Testing Database Connection

\`\`\`bash
db-backup test-connection --type postgres --host localhost --port 5432 --user postgres --password mypassword --database mydb
\`\`\`

### Creating a Backup

\`\`\`bash
# Basic backup to local storage
db-backup backup --type postgres --host localhost --port 5432 --user postgres --password mypassword --database mydb

# Backup with compression to S3
db-backup backup --type mysql --host localhost --port 3306 --user root --password mypassword --database mydb --compress --storage s3 --cloud-key YOUR_KEY --cloud-secret YOUR_SECRET --cloud-bucket your-bucket --cloud-region us-east-1
\`\`\`

### Scheduling Backups

\`\`\`bash
# Schedule a daily backup at midnight
db-backup schedule --type postgres --host localhost --port 5432 --user postgres --password mypassword --database mydb --cron "0 0 * * *" --compress
\`\`\`

### Listing Backups

\`\`\`bash
# List local backups
db-backup list

# List backups in S3
db-backup list --storage s3 --cloud-key YOUR_KEY --cloud-secret YOUR_SECRET --cloud-bucket your-bucket --cloud-region us-east-1
\`\`\`

### Restoring from Backup

\`\`\`bash
# Full restore
db-backup restore --type postgres --host localhost --port 5432 --user postgres --password mypassword --database mydb --file /path/to/backup.dump

# Selective restore
db-backup restore --type mysql --host localhost --port 3306 --user root --password mypassword --database mydb --file /path/to/backup.sql --selective "users,products"
\`\`\`

## Environment Variables

You can use environment variables instead of command-line options:

- `DB_BACKUP_TYPE`: Database type (postgres, mysql, mongodb, sqlite)
- `DB_BACKUP_HOST`: Database host
- `DB_BACKUP_PORT`: Database port
- `DB_BACKUP_USER`: Database username
- `DB_BACKUP_PASSWORD`: Database password
- `DB_BACKUP_DATABASE`: Database name
- `DB_BACKUP_STORAGE`: Storage type (local, s3, gcs, azure)
- `DB_BACKUP_CLOUD_KEY`: Cloud storage key
- `DB_BACKUP_CLOUD_SECRET`: Cloud storage secret
- `DB_BACKUP_CLOUD_BUCKET`: Cloud storage bucket
- `DB_BACKUP_CLOUD_REGION`: Cloud storage region

## Logging

Logs are stored in the `logs` directory:

- `combined.log`: All logs
- `error.log`: Error logs only
- Module-specific logs (e.g., `backup.log`, `restore.log`)

## License

MIT
