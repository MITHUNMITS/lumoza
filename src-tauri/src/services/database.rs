use std::{fs, path::Path};

use anyhow::Context;
use rusqlite::Connection;

const MIGRATION_SQL: &str = include_str!("../../migrations/0001_init.sql");

pub fn initialize_project_database(path: &Path) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).with_context(|| format!("failed to create {}", parent.display()))?;
    }

    let connection = Connection::open(path).with_context(|| format!("failed to open {}", path.display()))?;
    connection
        .execute_batch(MIGRATION_SQL)
        .with_context(|| format!("failed to apply migrations to {}", path.display()))?;

    Ok(())
}
