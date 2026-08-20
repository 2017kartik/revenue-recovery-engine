CREATE TABLE IF NOT EXISTS failed_transactions (
    id UUID PRIMARY KEY,
    customer_name VARCHAR NOT NULL,
    amount DECIMAL NOT NULL,
    failure_reason VARCHAR NOT NULL,
    recovery_status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL,
    llm_prompt TEXT NOT NULL,
    llm_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES failed_transactions (id)
);
