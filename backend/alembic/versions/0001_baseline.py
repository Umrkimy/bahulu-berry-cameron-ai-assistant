import sqlalchemy as sa
from alembic import op

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('admins',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=50), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('is_superuser', sa.Boolean(), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admins_username'), 'admins', ['username'], unique=True)
    op.create_index(op.f('ix_admins_is_active'), 'admins', ['is_active'], unique=False)
    op.create_index(op.f('ix_admins_email'), 'admins', ['email'], unique=True)
    op.create_index(op.f('ix_admins_id'), 'admins', ['id'], unique=False)
    op.create_index(op.f('ix_admins_role'), 'admins', ['role'], unique=False)
    op.create_table('customers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('phone_number', sa.String(length=20), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('address', sa.String(length=255), nullable=True),
    sa.Column('city', sa.String(length=100), nullable=True),
    sa.Column('state', sa.String(length=100), nullable=True),
    sa.Column('postal_code', sa.String(length=20), nullable=True),
    sa.Column('country', sa.String(length=100), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_customers_phone_number'), 'customers', ['phone_number'], unique=True)
    op.create_index(op.f('ix_customers_id'), 'customers', ['id'], unique=False)
    op.create_table('handoff_rules',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('trigger', sa.String(length=120), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('trigger')
    )
    op.create_table('products',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('image_file', sa.String(length=200), nullable=True),
    sa.Column('category', sa.String(length=50), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_id'), 'products', ['id'], unique=False)
    op.create_index(op.f('ix_products_name'), 'products', ['name'], unique=False)
    op.create_table('support_faqs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('category', sa.String(length=80), nullable=False),
    sa.Column('question_en', sa.Text(), nullable=False),
    sa.Column('answer_en', sa.Text(), nullable=False),
    sa.Column('question_ms', sa.Text(), nullable=True),
    sa.Column('answer_ms', sa.Text(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('support_templates',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('category', sa.String(length=80), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('content_en', sa.Text(), nullable=False),
    sa.Column('content_ms', sa.Text(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('activity_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('admin_id', sa.Integer(), nullable=True),
    sa.Column('action', sa.String(length=50), nullable=False),
    sa.Column('entity_type', sa.String(length=50), nullable=False),
    sa.Column('entity_id', sa.Integer(), nullable=True),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('metadata_json', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['admin_id'], ['admins.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_logs_entity_type'), 'activity_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_activity_logs_id'), 'activity_logs', ['id'], unique=False)
    op.create_index(op.f('ix_activity_logs_entity_id'), 'activity_logs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_activity_logs_admin_id'), 'activity_logs', ['admin_id'], unique=False)
    op.create_index(op.f('ix_activity_logs_action'), 'activity_logs', ['action'], unique=False)
    op.create_index(op.f('ix_activity_logs_created_at'), 'activity_logs', ['created_at'], unique=False)
    op.create_table('ai_action_confirmations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('admin_id', sa.Integer(), nullable=False),
    sa.Column('conversation_id', sa.String(length=36), nullable=False),
    sa.Column('action', sa.String(length=20), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('tool_name', sa.String(length=60), nullable=True),
    sa.Column('arguments', sa.JSON(), nullable=True),
    sa.Column('description', sa.String(length=500), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['admin_id'], ['admins.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('admin_id', 'conversation_id', name='uq_ai_action_confirmation_admin_conversation')
    )
    op.create_index(op.f('ix_ai_action_confirmations_admin_id'), 'ai_action_confirmations', ['admin_id'], unique=False)
    op.create_table('ai_usage',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('admin_id', sa.Integer(), nullable=True),
    sa.Column('source', sa.String(length=40), nullable=False),
    sa.Column('model', sa.String(length=100), nullable=False),
    sa.Column('input_tokens', sa.Integer(), nullable=False),
    sa.Column('output_tokens', sa.Integer(), nullable=False),
    sa.Column('estimated_cost_usd', sa.Numeric(precision=12, scale=6), nullable=False),
    sa.Column('outcome', sa.String(length=20), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['admin_id'], ['admins.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_usage_admin_id'), 'ai_usage', ['admin_id'], unique=False)
    op.create_index(op.f('ix_ai_usage_created_at'), 'ai_usage', ['created_at'], unique=False)
    op.create_index(op.f('ix_ai_usage_id'), 'ai_usage', ['id'], unique=False)
    op.create_index(op.f('ix_ai_usage_outcome'), 'ai_usage', ['outcome'], unique=False)
    op.create_table('discounts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('discount_type', sa.String(length=20), nullable=False),
    sa.Column('discount_value', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('bundle_quantity', sa.Integer(), nullable=True),
    sa.Column('stack_with_bundle', sa.Boolean(), nullable=False),
    sa.Column('start_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('end_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_discounts_id'), 'discounts', ['id'], unique=False)
    op.create_index(op.f('ix_discounts_product_id'), 'discounts', ['product_id'], unique=False)
    op.create_table('inventories',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('low_stock_threshold', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inventories_id'), 'inventories', ['id'], unique=False)
    op.create_index(op.f('ix_inventories_product_id'), 'inventories', ['product_id'], unique=True)
    op.create_table('orders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('customer_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('payment_status', sa.String(length=50), nullable=False),
    sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('subtotal', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_orders_customer_id'), 'orders', ['customer_id'], unique=False)
    op.create_index(op.f('ix_orders_id'), 'orders', ['id'], unique=False)
    op.create_table('support_requests',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('customer_id', sa.Integer(), nullable=True),
    sa.Column('customer_name', sa.String(length=160), nullable=False),
    sa.Column('contact', sa.String(length=160), nullable=True),
    sa.Column('source', sa.String(length=40), nullable=False),
    sa.Column('subject', sa.String(length=200), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('handoff_reason', sa.String(length=120), nullable=True),
    sa.Column('priority', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('handoff_state', sa.String(length=30), nullable=False),
    sa.Column('assigned_admin_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['assigned_admin_id'], ['admins.id'], ),
    sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_support_requests_handoff_state'), 'support_requests', ['handoff_state'], unique=False)
    op.create_table('deliveries',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('recipient_name', sa.String(length=100), nullable=True),
    sa.Column('recipient_phone', sa.String(length=30), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('city', sa.String(length=50), nullable=True),
    sa.Column('state', sa.String(length=50), nullable=True),
    sa.Column('postal_code', sa.String(length=20), nullable=True),
    sa.Column('country', sa.String(length=50), nullable=False),
    sa.Column('courier', sa.String(length=100), nullable=True),
    sa.Column('tracking_number', sa.String(length=100), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('shipped_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('out_for_delivery_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('order_id', name='uq_deliveries_order_id')
    )
    op.create_index(op.f('ix_deliveries_order_id'), 'deliveries', ['order_id'], unique=False)
    op.create_index(op.f('ix_deliveries_id'), 'deliveries', ['id'], unique=False)
    op.create_table('messaging_conversations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('provider', sa.String(length=40), nullable=False),
    sa.Column('external_conversation_id', sa.String(length=160), nullable=False),
    sa.Column('contact_reference', sa.String(length=160), nullable=True),
    sa.Column('support_request_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['support_request_id'], ['support_requests.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('provider', 'external_conversation_id', name='uq_messaging_conversation_provider_external_id')
    )
    op.create_index(op.f('ix_messaging_conversations_provider'), 'messaging_conversations', ['provider'], unique=False)
    op.create_index(op.f('ix_messaging_conversations_support_request_id'), 'messaging_conversations', ['support_request_id'], unique=False)
    op.create_table('order_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('subtotal', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('discount_id', sa.Integer(), nullable=True),
    sa.Column('discount_name', sa.String(length=100), nullable=True),
    sa.Column('discount_type', sa.String(length=20), nullable=True),
    sa.Column('discount_value', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('discount_bundle_quantity', sa.Integer(), nullable=True),
    sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.ForeignKeyConstraint(['discount_id'], ['discounts.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_order_items_discount_id'), 'order_items', ['discount_id'], unique=False)
    op.create_index(op.f('ix_order_items_order_id'), 'order_items', ['order_id'], unique=False)
    op.create_index(op.f('ix_order_items_product_id'), 'order_items', ['product_id'], unique=False)
    op.create_index(op.f('ix_order_items_id'), 'order_items', ['id'], unique=False)
    op.create_table('payments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('provider', sa.String(length=50), nullable=False),
    sa.Column('provider_payment_id', sa.String(length=255), nullable=True),
    sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('currency', sa.String(length=10), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('payment_url', sa.String(length=1000), nullable=True),
    sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('provider_refund_id', sa.String(length=255), nullable=True),
    sa.Column('refund_reason', sa.Text(), nullable=True),
    sa.Column('refunded_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payments_provider_refund_id'), 'payments', ['provider_refund_id'], unique=False)
    op.create_index(op.f('ix_payments_provider_payment_id'), 'payments', ['provider_payment_id'], unique=False)
    op.create_index(op.f('ix_payments_order_id'), 'payments', ['order_id'], unique=False)
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'], unique=False)
    op.create_table('refund_requests',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('requested_by_admin_id', sa.Integer(), nullable=False),
    sa.Column('reviewed_by_admin_id', sa.Integer(), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('internal_note', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('refunded_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
    sa.ForeignKeyConstraint(['requested_by_admin_id'], ['admins.id'], ),
    sa.ForeignKeyConstraint(['reviewed_by_admin_id'], ['admins.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('order_id', name='uq_refund_requests_order_id')
    )
    op.create_index(op.f('ix_refund_requests_created_at'), 'refund_requests', ['created_at'], unique=False)
    op.create_index(op.f('ix_refund_requests_reviewed_by_admin_id'), 'refund_requests', ['reviewed_by_admin_id'], unique=False)
    op.create_index(op.f('ix_refund_requests_id'), 'refund_requests', ['id'], unique=False)
    op.create_index(op.f('ix_refund_requests_order_id'), 'refund_requests', ['order_id'], unique=False)
    op.create_index(op.f('ix_refund_requests_status'), 'refund_requests', ['status'], unique=False)
    op.create_index(op.f('ix_refund_requests_requested_by_admin_id'), 'refund_requests', ['requested_by_admin_id'], unique=False)
    op.create_table('support_request_notes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('support_request_id', sa.Integer(), nullable=False),
    sa.Column('author_admin_id', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['author_admin_id'], ['admins.id'], ),
    sa.ForeignKeyConstraint(['support_request_id'], ['support_requests.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_support_request_notes_support_request_id'), 'support_request_notes', ['support_request_id'], unique=False)
    op.create_index(op.f('ix_support_request_notes_created_at'), 'support_request_notes', ['created_at'], unique=False)
    op.create_index(op.f('ix_support_request_notes_author_admin_id'), 'support_request_notes', ['author_admin_id'], unique=False)
    op.create_table('messaging_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('provider', sa.String(length=40), nullable=False),
    sa.Column('external_message_id', sa.String(length=160), nullable=False),
    sa.Column('conversation_id', sa.Integer(), nullable=False),
    sa.Column('support_request_id', sa.Integer(), nullable=True),
    sa.Column('direction', sa.String(length=20), nullable=False),
    sa.Column('outcome', sa.String(length=30), nullable=False),
    sa.Column('payload_hash', sa.String(length=64), nullable=False),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('author_admin_id', sa.Integer(), nullable=True),
    sa.Column('processed_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['author_admin_id'], ['admins.id'], ),
    sa.ForeignKeyConstraint(['conversation_id'], ['messaging_conversations.id'], ),
    sa.ForeignKeyConstraint(['support_request_id'], ['support_requests.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('provider', 'external_message_id', name='uq_messaging_event_provider_external_id')
    )
    op.create_index(op.f('ix_messaging_events_conversation_id'), 'messaging_events', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_messaging_events_processed_at'), 'messaging_events', ['processed_at'], unique=False)
    op.create_index(op.f('ix_messaging_events_support_request_id'), 'messaging_events', ['support_request_id'], unique=False)
    op.create_index(op.f('ix_messaging_events_expires_at'), 'messaging_events', ['expires_at'], unique=False)
    op.create_index(op.f('ix_messaging_events_provider'), 'messaging_events', ['provider'], unique=False)


def downgrade():
    op.drop_table("messaging_events")
    op.drop_table("support_request_notes")
    op.drop_table("refund_requests")
    op.drop_table("payments")
    op.drop_table("order_items")
    op.drop_table("messaging_conversations")
    op.drop_table("deliveries")
    op.drop_table("support_requests")
    op.drop_table("orders")
    op.drop_table("inventories")
    op.drop_table("discounts")
    op.drop_table("ai_usage")
    op.drop_table("ai_action_confirmations")
    op.drop_table("activity_logs")
    op.drop_table("support_templates")
    op.drop_table("support_faqs")
    op.drop_table("products")
    op.drop_table("handoff_rules")
    op.drop_table("customers")
    op.drop_table("admins")
