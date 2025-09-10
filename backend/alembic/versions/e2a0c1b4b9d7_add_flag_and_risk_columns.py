"""add flag columns on payment and risk_trigger on client_profiles

Revision ID: e2a0c1b4b9d7
Revises: d5a7f9c2c1a3
Create Date: 2025-09-09 02:25:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = 'e2a0c1b4b9d7'
down_revision = 'd5a7f9c2c1a3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # payment flag columns
    with op.batch_alter_table('payment') as batch:
        batch.add_column(sa.Column('flag_category', sa.String(), nullable=True))
        batch.add_column(sa.Column('flag_reason', sa.String(), nullable=True))
    op.create_index(op.f('ix_payment_flag_category'), 'payment', ['flag_category'], unique=False)
    # client_profiles risk trigger (table may not exist yet in older envs; guard)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'client_profiles' in inspector.get_table_names():
        with op.batch_alter_table('client_profiles') as batch:
            batch.add_column(sa.Column('risk_trigger', sa.String(), nullable=True))
        op.create_index(op.f('ix_client_profiles_risk_trigger'), 'client_profiles', ['risk_trigger'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'client_profiles' in inspector.get_table_names():
        op.drop_index(op.f('ix_client_profiles_risk_trigger'), table_name='client_profiles')
        with op.batch_alter_table('client_profiles') as batch:
            cols = {c['name'] for c in inspector.get_columns('client_profiles')}
            if 'risk_trigger' in cols:
                batch.drop_column('risk_trigger')
    op.drop_index(op.f('ix_payment_flag_category'), table_name='payment')
    with op.batch_alter_table('payment') as batch:
        cols = {c['name'] for c in inspector.get_columns('payment')}
        if 'flag_reason' in cols:
            batch.drop_column('flag_reason')
        if 'flag_category' in cols:
            batch.drop_column('flag_category')
