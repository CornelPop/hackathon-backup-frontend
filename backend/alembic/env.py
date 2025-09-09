from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from sqlalchemy import URL
from alembic import context
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/..')

from app.db.base import Base  # noqa: E402
from app.models import *  # noqa: F401,F403

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

def get_url():
    return os.getenv('DATABASE_URL', 'postgresql+psycopg2://app:app@localhost:5432/chargeback')

target_metadata = Base.metadata

def run_migrations_offline():
    url = get_url()
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        { 'sqlalchemy.url': get_url() },
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
