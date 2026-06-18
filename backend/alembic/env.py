"""
alembic/env.py — Alembic migration environment configuration.

Reads DATABASE_URL from the application settings and configures async
migration support using the SQLAlchemy asyncio extension.

Run migrations:
    alembic upgrade head

Generate a new migration:
    alembic revision --autogenerate -m "description"
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

# ── Import application components ─────────────────────────────────────────────
# We need the application config and all models to be imported so that
# Base.metadata is fully populated before Alembic inspects it.
from app.core.config import settings
from app.core.database import Base

# Import all models to register them on Base.metadata
from app.models import user, scan  # noqa: F401

# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config

# Set the SQLAlchemy URL from our application settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Configure Python logging from the alembic.ini [loggers] section
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata object that Alembic uses for autogenerate support
target_metadata = Base.metadata


# ── Migration helpers ─────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine,
    though an Engine is acceptable here as well.  By skipping the Engine
    creation we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode using an async engine."""
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
        future=True,
    )
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    """Entry point for online migration mode."""
    asyncio.run(run_async_migrations())


# ── Entry point ───────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
