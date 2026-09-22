-- CreateEnum
CREATE TYPE "CardState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');

-- CreateEnum
CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('DUE', 'AHEAD', 'ALL');

-- CreateTable
CREATE TABLE "review_states" (
    "card_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "state" "CardState" NOT NULL DEFAULT 'NEW',
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "scheduled_days" INTEGER NOT NULL DEFAULT 0,
    "last_review_at" TIMESTAMPTZ(3),
    "due_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduler_version" TEXT NOT NULL DEFAULT 'fsrs-6',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "review_states_pkey" PRIMARY KEY ("card_id")
);

-- CreateTable
CREATE TABLE "review_logs" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" UUID,
    "rating" "ReviewRating" NOT NULL,
    "reviewed_at" TIMESTAMPTZ(3) NOT NULL,
    "elapsed_ms" INTEGER,
    "scheduled_days" INTEGER NOT NULL,
    "previous_due_at" TIMESTAMPTZ(3),
    "next_due_at" TIMESTAMPTZ(3) NOT NULL,
    "stability_after" DOUBLE PRECISION NOT NULL,
    "difficulty_after" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "review_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "mode" "SessionMode" NOT NULL DEFAULT 'DUE',
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "cards_reviewed" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_states_user_id_due_at_idx" ON "review_states"("user_id", "due_at");

-- CreateIndex
CREATE INDEX "review_logs_card_id_reviewed_at_idx" ON "review_logs"("card_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "review_logs_user_id_reviewed_at_idx" ON "review_logs"("user_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "study_sessions_user_id_started_at_idx" ON "study_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "study_sessions_deck_id_status_idx" ON "study_sessions"("deck_id", "status");

-- AddForeignKey
ALTER TABLE "review_states" ADD CONSTRAINT "review_states_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_states" ADD CONSTRAINT "review_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "study_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
