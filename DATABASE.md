# 数据库操作指南

本项目使用 Cloudflare D1 数据库,支持**本地开发数据库**和**远程生产数据库**两种环境。

## 📋 快速参考

### 开发服务器

| 命令 | 说明 | 数据库环境 |
|------|------|-----------|
| `npm run dev` | 启动开发服务器(默认本地) | 本地 |
| `npm run dev:local` | 启动开发服务器(明确指定本地) | 本地 |
| `npm run dev:remote` | 启动开发服务器(连接远程) | 远程 |

### 数据库初始化

| 命令 | 说明 | 数据库环境 |
|------|------|-----------|
| `npm run db:init` | 初始化本地数据库 | 本地 |
| `npm run db:init:remote` | 初始化远程数据库 | 远程 |

### 数据库清空

| 命令 | 说明 | 数据库环境 |
|------|------|-----------|
| `npm run db:clear` | 清空本地数据库数据 | 本地 |
| `npm run db:clear:remote` | 清空远程数据库数据 | 远程 ⚠️ |

### 数据库重置

| 命令 | 说明 | 数据库环境 |
|------|------|-----------|
| `npm run db:reset` | 重置本地数据库(删除表+重建) | 本地 |
| `npm run db:reset:remote` | 重置远程数据库(删除表+重建) | 远程 ⚠️ |

## 🔍 如何区分本地 vs 远程

### 1. 查看命令参数
- **本地**: 命令中包含 `--local` 或无参数(默认)
- **远程**: 命令中包含 `--remote`

### 2. 查看执行输出
运行数据库命令时,wrangler 会明确显示:

**本地数据库:**
```
Resource location: local 
🌀 Executing on local database food-turns-luck from .wrangler\state\v3\d1:
```

**远程数据库:**
```
Resource location: remote
🌀 Executing on remote database food-turns-luck
```

### 3. 查看开发服务器输出
启动 `npm run dev` 时会显示绑定信息:
```
env.food_turns_luck_d1 (...)      D1 Database               local
                                                            ^^^^^ 这里显示环境
```

## 💡 使用建议

### 日常开发
```bash
# 1. 初始化本地数据库(首次或表结构变更后)
npm run db:init

# 2. 启动开发服务器(使用本地数据库)
npm run dev
```

### 部署到生产环境
```bash
# 1. 初始化远程数据库(首次部署或表结构变更后)
npm run db:init:remote

# 2. 部署代码
npm run deploy
```

### 测试远程数据库
```bash
# 在本地开发环境连接远程数据库进行测试
npm run dev:remote
```

## ⚠️ 重要提示

1. **本地数据库位置**: `.wrangler/state/v3/d1/` (不要提交到 Git)
2. **远程数据库**: 托管在 Cloudflare,通过 API 访问
3. **谨慎操作远程数据库**: 带 `:remote` 后缀的命令会影响生产数据!
4. **表结构变更**: 修改 `scripts/init-d1.sql` 后,需要运行对应的 `db:init` 命令

## 🗂️ 数据库脚本文件

- `scripts/init-d1.sql` - 数据库表结构定义
- `scripts/clear-data.sql` - 清空所有表数据(保留表结构)
- `scripts/reset-db.sql` - 删除所有表(完全重置)

## 📦 R2 对象存储配置

本项目使用 Cloudflare R2 存储用户上传的图片等文件。

### 环境配置

| 环境 | Bucket 名称 | 说明 |
|------|------------|------|
| 开发环境 (`npm run dev`) | `food-turns-luck-dev` | 开发测试用,与生产数据隔离 |
| 生产环境 (`npm run deploy`) | `food-turns-luck` | 生产环境数据 |

### R2 vs D1 的区别

| 特性 | D1 数据库 | R2 对象存储 |
|------|----------|------------|
| 本地模拟 | ✅ 完整支持,数据持久化 | ⚠️ 仅内存模拟,重启丢失 |
| 推荐开发方式 | 使用本地数据库 (`--local`) | 使用远程 dev bucket |
| 数据隔离 | 本地/远程完全独立 | dev/prod bucket 独立 |

### 注意事项

- R2 的本地模拟不会持久化数据,重启开发服务器后上传的文件会丢失
- 开发环境已配置使用 `food-turns-luck-dev` bucket,可以放心测试上传功能
- 生产环境使用 `food-turns-luck` bucket,两者数据完全隔离

## 🐛 常见问题

### Q: 为什么会出现 "datatype mismatch" 错误?
A: 可能是本地数据库表结构过期,运行 `npm run db:reset` 重置本地数据库。

### Q: 如何查看数据库内容?
A: 使用 wrangler 命令:
```bash
# 查看本地数据库
npx wrangler d1 execute food-turns-luck --local --command="SELECT * FROM users"

# 查看远程数据库
npx wrangler d1 execute food-turns-luck --remote --command="SELECT * FROM users"
```

### Q: 本地和远程数据库会自动同步吗?
A: **不会**。本地和远程是完全独立的数据库,需要分别管理。
