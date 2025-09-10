"""expand payment add userrole (placeholder)

Revision ID: d5a7f9c2c1a3
Revises: 2784a0542509
Create Date: 2025-09-09 02:12:00.000000

Originally created empty; filled now so Alembic can traverse the graph. No ops.
"""

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401

revision = 'd5a7f9c2c1a3'
down_revision = '2784a0542509'
branch_labels = None
depends_on = None


def upgrade() -> None:  # pragma: no cover
	pass


def downgrade() -> None:  # pragma: no cover
	pass

