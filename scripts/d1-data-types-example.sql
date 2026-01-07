-- ============================================
-- Cloudflare D1 数据类型完整示例
-- D1 基于 SQLite，支持以下数据类型
-- ============================================

-- ============================================
-- 1. INTEGER - 整数类型
-- ============================================
-- 说明：
-- - 存储整数值（正数、负数、零）
-- - 可以是 1, 2, 3, 4, 6, 或 8 字节
-- - 范围：-9,223,372,036,854,775,808 到 9,223,372,036,854,775,807
-- - 常用于：ID、计数、年龄、数量等

CREATE TABLE IF NOT EXISTS integer_examples (
  -- 主键 ID（自动递增）
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 普通整数
  age INTEGER NOT NULL,
  
  -- 计数器
  view_count INTEGER DEFAULT 0,
  
  -- 布尔值（SQLite 没有真正的 BOOLEAN，用 0/1 表示）
  is_active INTEGER DEFAULT 1,  -- 0 = false, 1 = true
  is_verified INTEGER DEFAULT 0,
  
  -- 时间戳（Unix 时间戳，秒）
  created_timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  
  -- 枚举值（用整数表示状态）
  status INTEGER DEFAULT 0,  -- 0=pending, 1=active, 2=inactive, 3=deleted
  
  -- 外键
  user_id INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);


-- ============================================
-- 2. REAL - 浮点数类型
-- ============================================
-- 说明：
-- - 存储浮点数（小数）
-- - 8 字节浮点数
-- - 常用于：价格、评分、坐标、百分比等

CREATE TABLE IF NOT EXISTS real_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 价格（金额）
  price REAL NOT NULL,
  
  -- 评分
  rating REAL DEFAULT 0.0,  -- 0.0 到 5.0
  
  -- 百分比
  discount_rate REAL,  -- 0.0 到 1.0 (0% 到 100%)
  
  -- 坐标
  latitude REAL,   -- 纬度
  longitude REAL,  -- 经度
  
  -- 重量/尺寸
  weight REAL,     -- 千克
  height REAL,     -- 米
  
  -- 温度
  temperature REAL
);


-- ============================================
-- 3. TEXT - 文本类型
-- ============================================
-- 说明：
-- - 存储字符串文本
-- - 使用 UTF-8 编码
-- - 无长度限制（理论上可达 1GB）
-- - 常用于：名称、描述、URL、JSON 等

CREATE TABLE IF NOT EXISTS text_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 短文本
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  
  -- 中等长度文本
  title TEXT NOT NULL,
  description TEXT,
  
  -- 长文本
  content TEXT,  -- 文章内容
  bio TEXT,      -- 个人简介
  
  -- URL
  avatar_url TEXT,
  website TEXT,
  
  -- JSON 字符串（D1 支持 JSON 函数）
  metadata TEXT,  -- 存储 JSON 格式的数据
  settings TEXT,  -- 用户设置（JSON）
  
  -- 枚举（文本形式）
  role TEXT DEFAULT 'user',  -- 'admin', 'user', 'guest'
  gender TEXT,  -- 'male', 'female', 'other'
  
  -- 哈希值
  password_hash TEXT NOT NULL,
  
  -- UUID
  uuid TEXT DEFAULT (lower(hex(randomblob(16)))),
  
  -- 标签（逗号分隔或 JSON 数组）
  tags TEXT,  -- 'tag1,tag2,tag3' 或 '["tag1","tag2"]'
  
  -- 颜色代码
  color TEXT DEFAULT '#000000'
);


-- ============================================
-- 4. BLOB - 二进制数据类型
-- ============================================
-- 说明：
-- - 存储二进制数据（原始字节）
-- - 常用于：小图片、文件、加密数据等
-- - 注意：大文件建议存储到 R2，这里只存 key

CREATE TABLE IF NOT EXISTS blob_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 小图标/缩略图（不推荐存大文件）
  thumbnail BLOB,
  
  -- 加密数据
  encrypted_data BLOB,
  
  -- 签名
  signature BLOB,
  
  -- 注意：实际项目中，大文件应该存储到 R2
  -- 这里只存储 R2 的 key
  file_key TEXT,  -- 'files/document.pdf'
  image_key TEXT  -- 'images/photo.jpg'
);


-- ============================================
-- 5. DATETIME / DATE / TIME - 日期时间类型
-- ============================================
-- 说明：
-- - SQLite 没有专门的日期时间类型
-- - 可以用 TEXT、INTEGER、REAL 存储
-- - TEXT 格式：'YYYY-MM-DD HH:MM:SS'
-- - INTEGER 格式：Unix 时间戳
-- - REAL 格式：Julian day numbers

CREATE TABLE IF NOT EXISTS datetime_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 方式 1：TEXT 格式（推荐，易读）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,  -- 软删除时间
  
  -- 仅日期
  birth_date TEXT,  -- 'YYYY-MM-DD'
  
  -- 仅时间
  open_time TEXT,   -- 'HH:MM:SS'
  
  -- 带时区的时间（UTC）
  published_at TEXT DEFAULT (datetime('now', 'utc')),
  
  -- 方式 2：INTEGER 格式（Unix 时间戳，性能更好）
  created_timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  updated_timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  
  -- 过期时间
  expires_at TEXT,
  expires_timestamp INTEGER
);


-- ============================================
-- 6. NULL - 空值
-- ============================================
-- 说明：
-- - 表示缺失或未知的值
-- - 任何类型都可以是 NULL（除非指定 NOT NULL）

CREATE TABLE IF NOT EXISTS null_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 必填字段（不能为 NULL）
  required_field TEXT NOT NULL,
  
  -- 可选字段（可以为 NULL）
  optional_field TEXT,
  optional_number INTEGER,
  
  -- 带默认值（如果不提供值，使用默认值而非 NULL）
  status TEXT DEFAULT 'pending',
  count INTEGER DEFAULT 0
);


-- ============================================
-- 7. 综合示例 - 用户表（包含所有常用类型）
-- ============================================

CREATE TABLE IF NOT EXISTS users_complete (
  -- 主键
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 唯一标识符
  uid TEXT NOT NULL UNIQUE,
  uuid TEXT DEFAULT (lower(hex(randomblob(16)))),
  
  -- 基本信息（TEXT）
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  nickname TEXT,
  bio TEXT,
  
  -- 密码（TEXT - 哈希值）
  password_hash TEXT NOT NULL,
  
  -- 文件引用（TEXT - R2 key）
  avatar_key TEXT,
  cover_key TEXT,
  
  -- 数值（INTEGER）
  age INTEGER,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  
  -- 布尔值（INTEGER 0/1）
  is_active INTEGER DEFAULT 1,
  is_verified INTEGER DEFAULT 0,
  is_premium INTEGER DEFAULT 0,
  
  -- 枚举（TEXT 或 INTEGER）
  role TEXT DEFAULT 'user',  -- 'admin', 'moderator', 'user'
  status INTEGER DEFAULT 1,  -- 0=inactive, 1=active, 2=banned
  
  -- 浮点数（REAL）
  rating REAL DEFAULT 0.0,
  balance REAL DEFAULT 0.0,
  
  -- JSON 数据（TEXT）
  settings TEXT,  -- '{"theme":"dark","language":"zh-CN"}'
  metadata TEXT,
  
  -- 日期时间（TEXT）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT,
  deleted_at TEXT,  -- 软删除
  
  -- 时间戳（INTEGER）
  created_timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  
  -- 约束
  CHECK (age >= 0 AND age <= 150),
  CHECK (rating >= 0.0 AND rating <= 5.0)
);


-- ============================================
-- 8. 索引示例
-- ============================================

-- 单列索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users_complete(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users_complete(username);

-- 多列索引
CREATE INDEX IF NOT EXISTS idx_users_status_created ON users_complete(status, created_at);

-- 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uid ON users_complete(uid);

-- 部分索引（条件索引）
CREATE INDEX IF NOT EXISTS idx_active_users ON users_complete(created_at) 
WHERE is_active = 1 AND deleted_at IS NULL;


-- ============================================
-- 9. 外键约束示例
-- ============================================

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  
  -- 外键约束
  FOREIGN KEY (user_id) REFERENCES users_complete(id) 
    ON DELETE CASCADE  -- 删除用户时，同时删除其所有帖子
    ON UPDATE CASCADE
);


-- ============================================
-- 10. 常用查询示例
-- ============================================

-- 插入数据
-- INSERT INTO users_complete (uid, username, email, password_hash, age) 
-- VALUES ('user_001', 'alice', 'alice@example.com', 'hashed_password', 25);

-- 查询 JSON 字段
-- SELECT json_extract(settings, '$.theme') as theme FROM users_complete;

-- 日期查询
-- SELECT * FROM users_complete WHERE created_at > datetime('now', '-7 days');

-- 时间戳查询
-- SELECT * FROM users_complete WHERE created_timestamp > strftime('%s', 'now', '-7 days');

-- 软删除
-- UPDATE users_complete SET deleted_at = datetime('now') WHERE id = 1;

-- 查询未删除的记录
-- SELECT * FROM users_complete WHERE deleted_at IS NULL;
