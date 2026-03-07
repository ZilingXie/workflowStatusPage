CREATE UNIQUE INDEX IF NOT EXISTS "user_accounts_email_key" ON "user_accounts"("email");

CREATE TABLE "account_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "token_hash" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "used_by_username" TEXT,
    CONSTRAINT "account_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_invitations_token_hash_key" ON "account_invitations"("token_hash");
CREATE INDEX "account_invitations_email_idx" ON "account_invitations"("email");
CREATE INDEX "account_invitations_expires_at_idx" ON "account_invitations"("expires_at");
