-- Idempotency key for offline review replay (NFR-04.2)
ALTER TABLE "review_logs" ADD COLUMN "client_review_id" UUID;

CREATE UNIQUE INDEX "review_logs_session_id_client_review_id_key" ON "review_logs"("session_id", "client_review_id");

-- Public catalogue lookups filter by visibility (RF-11)
CREATE INDEX "decks_visibility_idx" ON "decks"("visibility");
