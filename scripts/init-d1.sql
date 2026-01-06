-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE, -- 用于登录的唯一标识符
  nickname TEXT,
  avatar_key TEXT,          -- 对应 R2 中的对象 key，如 "avatars/user123.jpg"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
