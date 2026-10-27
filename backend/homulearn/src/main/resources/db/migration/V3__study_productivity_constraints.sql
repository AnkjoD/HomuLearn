-- V3: thêm cột mới cho goals và idempotency cho pomodoro_sessions

-- goals: unit, status
ALTER TABLE goals ADD COLUMN IF NOT EXISTS unit varchar(100);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'IN_PROGRESS';

-- constraints cho goals
ALTER TABLE goals ADD CONSTRAINT goals_target_positive CHECK (target_value > 0);
ALTER TABLE goals ADD CONSTRAINT goals_progress_nonneg CHECK (current_progress >= 0);
ALTER TABLE goals ALTER COLUMN title SET NOT NULL;
ALTER TABLE goals ADD CONSTRAINT goals_title_nonempty CHECK (trim(title) <> '');

-- pomodoro: idempotency_key (uuid string), started_at
ALTER TABLE pomodoro_sessions ADD COLUMN IF NOT EXISTS idempotency_key varchar(36);
ALTER TABLE pomodoro_sessions ADD COLUMN IF NOT EXISTS started_at timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS pomo_idempotency_key
    ON pomodoro_sessions(idempotency_key)
    WHERE idempotency_key IS NOT NULL;
