-- 013 In-platform messaging (Spec §3.4b)
--
-- message_threads: one per (context_type, context_id) pair, created lazily on
--   first message — NOT pre-created for every order or enquiry.
--
-- messages: chronological log of messages within a thread.

CREATE TABLE message_threads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT        NOT NULL CHECK (context_type IN ('enquiry', 'order')),
  context_id   UUID        NOT NULL,
  buyer_id     UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  seller_id    UUID        NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (context_type, context_id)
);

CREATE INDEX idx_message_threads_buyer  ON message_threads (buyer_id);
CREATE INDEX idx_message_threads_seller ON message_threads (seller_id);

CREATE TABLE messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID        NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL,
  sender_type TEXT        NOT NULL CHECK (sender_type IN ('buyer', 'seller')),
  body        TEXT        NOT NULL CHECK (length(trim(body)) > 0),
  date_sent   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_thread_date ON messages (thread_id, date_sent);
