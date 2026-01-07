# Cloudflare D1 数据类型快速参考

## 📋 支持的数据类型

D1 基于 SQLite，支持以下 5 种存储类型：

| 类型 | 说明 | 常用场景 | 示例 |
|------|------|---------|------|
| **INTEGER** | 整数 | ID、计数、布尔值、时间戳 | `1`, `42`, `-100` |
| **REAL** | 浮点数 | 价格、评分、坐标 | `3.14`, `99.99`, `-0.5` |
| **TEXT** | 文本字符串 | 名称、描述、URL、JSON | `'Hello'`, `'user@example.com'` |
| **BLOB** | 二进制数据 | 小文件、加密数据 | 二进制字节流 |
| **NULL** | 空值 | 表示缺失或未知 | `NULL` |

## 🔢 INTEGER - 整数类型

```sql
-- 主键（自动递增）
id INTEGER PRIMARY KEY AUTOINCREMENT

-- 普通整数
age INTEGER NOT NULL
view_count INTEGER DEFAULT 0

-- 布尔值（用 0/1 表示）
is_active INTEGER DEFAULT 1  -- 0 = false, 1 = true

-- 枚举（用数字表示状态）
status INTEGER DEFAULT 0  -- 0=pending, 1=active, 2=inactive

-- Unix 时间戳
created_timestamp INTEGER DEFAULT (strftime('%s', 'now'))

-- 外键
user_id INTEGER
FOREIGN KEY (user_id) REFERENCES users(id)
```

**范围**: `-9,223,372,036,854,775,808` 到 `9,223,372,036,854,775,807`

## 📊 REAL - 浮点数类型

```sql
-- 价格
price REAL NOT NULL

-- 评分
rating REAL DEFAULT 0.0  -- 0.0 到 5.0

-- 百分比
discount_rate REAL  -- 0.0 到 1.0

-- 坐标
latitude REAL
longitude REAL

-- 带约束
CHECK (rating >= 0.0 AND rating <= 5.0)
```

**精度**: 8 字节双精度浮点数

## 📝 TEXT - 文本类型

```sql
-- 短文本
username TEXT NOT NULL UNIQUE
email TEXT NOT NULL UNIQUE
phone TEXT

-- 中等长度
title TEXT NOT NULL
description TEXT

-- 长文本
content TEXT
bio TEXT

-- URL
avatar_url TEXT
website TEXT

-- JSON（存储为文本）
settings TEXT  -- '{"theme":"dark","language":"zh-CN"}'
metadata TEXT

-- 枚举（文本形式）
role TEXT DEFAULT 'user'  -- 'admin', 'user', 'guest'

-- UUID
uuid TEXT DEFAULT (lower(hex(randomblob(16))))

-- 哈希值
password_hash TEXT NOT NULL

-- R2 文件引用
avatar_key TEXT  -- 'avatars/user123.jpg'
```

**编码**: UTF-8  
**长度**: 理论上可达 1GB（实际建议小于 1MB）

## 📅 日期时间类型

SQLite/D1 没有专门的日期时间类型，使用以下方式存储：

### 方式 1: TEXT 格式（推荐，易读）

```sql
-- 日期时间
created_at TEXT DEFAULT (datetime('now'))
updated_at TEXT DEFAULT (datetime('now'))

-- 仅日期
birth_date TEXT  -- 'YYYY-MM-DD'

-- 仅时间
open_time TEXT  -- 'HH:MM:SS'

-- UTC 时间
published_at TEXT DEFAULT (datetime('now', 'utc'))
```

**格式**: `'YYYY-MM-DD HH:MM:SS'`  
**示例**: `'2024-01-07 15:30:00'`

### 方式 2: INTEGER 格式（Unix 时间戳）

```sql
created_timestamp INTEGER DEFAULT (strftime('%s', 'now'))
updated_timestamp INTEGER DEFAULT (strftime('%s', 'now'))
```

**格式**: Unix 时间戳（秒）  
**示例**: `1704636600`

## 🔍 常用约束

```sql
-- 主键
id INTEGER PRIMARY KEY AUTOINCREMENT

-- 非空
username TEXT NOT NULL

-- 唯一
email TEXT UNIQUE

-- 默认值
status INTEGER DEFAULT 1
created_at TEXT DEFAULT (datetime('now'))

-- 检查约束
age INTEGER CHECK (age >= 0 AND age <= 150)
rating REAL CHECK (rating >= 0.0 AND rating <= 5.0)

-- 外键
user_id INTEGER
FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE
```

## 📌 索引

```sql
-- 单列索引
CREATE INDEX idx_users_email ON users(email);

-- 多列索引
CREATE INDEX idx_users_status_created ON users(status, created_at);

-- 唯一索引
CREATE UNIQUE INDEX idx_users_uid ON users(uid);

-- 部分索引（条件索引）
CREATE INDEX idx_active_users ON users(created_at)
WHERE is_active = 1 AND deleted_at IS NULL;
```

## 💡 最佳实践

### ✅ 推荐做法

1. **主键使用 AUTOINCREMENT**
   ```sql
   id INTEGER PRIMARY KEY AUTOINCREMENT
   ```

2. **日期时间用 TEXT 格式**（易读易查询）
   ```sql
   created_at TEXT DEFAULT (datetime('now'))
   ```

3. **布尔值用 INTEGER 0/1**
   ```sql
   is_active INTEGER DEFAULT 1
   ```

4. **大文件存 R2，数据库只存 key**
   ```sql
   avatar_key TEXT  -- 'avatars/user123.jpg'
   ```

5. **JSON 数据存为 TEXT**
   ```sql
   settings TEXT  -- '{"theme":"dark"}'
   ```

6. **添加必要的索引**
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   ```

### ❌ 避免做法

1. ❌ 不要在数据库存储大文件（使用 R2）
2. ❌ 不要使用 `DATETIME` 类型（使用 TEXT 或 INTEGER）
3. ❌ 不要忘记添加索引（影响查询性能）
4. ❌ 不要使用 `VARCHAR(n)`（SQLite 会忽略长度限制）

## 🔧 常用 SQL 函数

### 日期时间函数

```sql
-- 当前时间
datetime('now')              -- '2024-01-07 15:30:00'
date('now')                  -- '2024-01-07'
time('now')                  -- '15:30:00'

-- 时间计算
datetime('now', '+7 days')   -- 7 天后
datetime('now', '-1 month')  -- 1 个月前
datetime('now', '+1 year')   -- 1 年后

-- Unix 时间戳
strftime('%s', 'now')        -- 当前 Unix 时间戳

-- 格式化
strftime('%Y-%m-%d', 'now')  -- '2024-01-07'
```

### JSON 函数

```sql
-- 提取 JSON 字段
json_extract(settings, '$.theme')

-- 查询示例
SELECT json_extract(settings, '$.theme') as theme 
FROM users 
WHERE json_extract(settings, '$.language') = 'zh-CN';
```

### 字符串函数

```sql
-- 大小写转换
lower(email)
upper(username)

-- 拼接
username || '@' || domain

-- 长度
length(content)

-- 截取
substr(text, 1, 10)
```

## 📚 参考资料

- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [SQLite 数据类型](https://www.sqlite.org/datatype3.html)
- [SQLite 日期时间函数](https://www.sqlite.org/lang_datefunc.html)
- [SQLite JSON 函数](https://www.sqlite.org/json1.html)
