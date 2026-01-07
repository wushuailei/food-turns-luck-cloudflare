-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,      -- 用户唯一标识符（同时作为主键和登录标识）
  nickname TEXT,            -- 昵称
  avatar_key TEXT,          -- 对应 R2 中的对象 key，如 "avatars/user123.jpg"
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
  name TEXT PRIMARY KEY,                            -- 标签名称（主键）
  created_at TEXT DEFAULT (datetime('now'))
);

-- 菜谱表
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,                              -- 菜谱唯一标识符
  user_id TEXT NOT NULL,                            -- 创建者用户ID
  name TEXT NOT NULL,                               -- 菜谱名称
  description TEXT,                                 -- 菜谱描述
  cover_image_key TEXT,                             -- 封面图片 R2 key
  step_type TEXT NOT NULL DEFAULT 'custom',         -- 步骤类型: 'custom'=自定义步骤, 'link'=外部链接
  steps TEXT,                                       -- JSON 数组存储自定义步骤 (当 step_type='custom' 时使用)
                                                    -- 格式: [{"step": 1, "title": "第一步", "content": "..."}]
  links TEXT,                                       -- JSON 数组存储外部链接 (当 step_type='link' 时使用)
                                                    -- 格式: [{"platform": "小红书", "url": "https://..."}]
  is_public INTEGER DEFAULT 1,                      -- 是否公开: 1=公开, 0=私密
  view_count INTEGER DEFAULT 0,                     -- 浏览次数
  like_count INTEGER DEFAULT 0,                     -- 点赞次数
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (step_type IN ('custom', 'link')),
  CHECK (is_public IN (0, 1))
);

-- 菜谱表索引
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_step_type ON recipes(step_type);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);

-- 部分索引：只索引公开的菜谱
CREATE INDEX IF NOT EXISTS idx_public_recipes ON recipes(created_at DESC) 
WHERE is_public = 1;

-- 菜谱-标签关联表（多对多关系）
CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id TEXT NOT NULL,                          -- 菜谱ID
  tag_name TEXT NOT NULL,                           -- 标签名称
  created_at TEXT DEFAULT (datetime('now')),
  
  PRIMARY KEY (recipe_id, tag_name),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_name) REFERENCES tags(name) ON DELETE CASCADE
);

-- 菜谱-标签关联表索引
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_name ON recipe_tags(tag_name);

-- 用户收藏表（多对多关系）
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id TEXT NOT NULL,                            -- 用户ID
  recipe_id TEXT NOT NULL,                          -- 菜谱ID
  created_at TEXT DEFAULT (datetime('now')),        -- 收藏时间
  
  PRIMARY KEY (user_id, recipe_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- 用户收藏表索引
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_recipe_id ON user_favorites(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                              -- 订单唯一标识符
  user_id TEXT NOT NULL,                            -- 用户ID
  order_no TEXT NOT NULL UNIQUE,                    -- 订单号（唯一）
  target_time TEXT,                                 -- 目标时间（期待做菜的时间）
  status TEXT NOT NULL DEFAULT 'pending',           -- 状态: pending=待完成, completed=已完成
  remark TEXT,                                      -- 订单备注
  created_at TEXT DEFAULT (datetime('now')),        -- 下单时间
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (status IN ('pending', 'completed'))
);

-- 订单表索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_target_time ON orders(target_time);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 订单-菜谱关联表（多对多关系）
CREATE TABLE IF NOT EXISTS order_recipes (
  order_id TEXT NOT NULL,                           -- 订单ID
  recipe_id TEXT NOT NULL,                          -- 菜谱ID
  quantity INTEGER DEFAULT 1,                       -- 数量
  created_at TEXT DEFAULT (datetime('now')),
  
  PRIMARY KEY (order_id, recipe_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- 订单-菜谱关联表索引
CREATE INDEX IF NOT EXISTS idx_order_recipes_order_id ON order_recipes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_recipes_recipe_id ON order_recipes(recipe_id);

-- 用户关系表（伴侣/家庭关系）
CREATE TABLE IF NOT EXISTS user_relationships (
  user_id TEXT NOT NULL,                            -- 用户ID
  related_user_id TEXT NOT NULL,                    -- 关联用户ID（伴侣/家人）
  relationship_type TEXT DEFAULT 'partner',         -- 关系类型: partner=伴侣, family=家人
  created_at TEXT DEFAULT (datetime('now')),
  
  PRIMARY KEY (user_id, related_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (user_id != related_user_id),               -- 不能和自己建立关系
  CHECK (relationship_type IN ('partner', 'family'))
);

-- 用户关系表索引
CREATE INDEX IF NOT EXISTS idx_user_relationships_user_id ON user_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_related_user_id ON user_relationships(related_user_id);

-- 订单评价表
CREATE TABLE IF NOT EXISTS order_reviews (
  id TEXT PRIMARY KEY,                              -- 评价唯一标识符
  order_id TEXT NOT NULL,                           -- 订单ID
  user_id TEXT NOT NULL,                            -- 评价者用户ID
  rating INTEGER,                                   -- 评分（1-5星，可选）
  content TEXT,                                     -- 评价内容（文字）
  images TEXT,                                      -- 评价图片，JSON 数组存储 R2 keys
                                                    -- 格式: ["reviews/img1.jpg", "reviews/img2.jpg"]
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

-- 订单评价表索引
CREATE INDEX IF NOT EXISTS idx_order_reviews_order_id ON order_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_order_reviews_user_id ON order_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_order_reviews_rating ON order_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_order_reviews_created_at ON order_reviews(created_at);