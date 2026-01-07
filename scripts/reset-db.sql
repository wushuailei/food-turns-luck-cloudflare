-- 完全重置数据库（删除表结构和数据）

-- 删除索引
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_uid;
DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_active_users;

-- 删除表
DROP TABLE IF EXISTS users;

-- 如果有其他表，也添加在这里
-- DROP TABLE IF EXISTS posts;
-- DROP TABLE IF EXISTS comments;
