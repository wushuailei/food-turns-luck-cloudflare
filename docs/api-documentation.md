# API 接口文档

本文档包含所有后端 API 接口的详细说明。

## 目录

- [认证接口 (Auth)](#认证接口-auth)
- [用户接口 (User)](#用户接口-user)
- [菜谱接口 (Recipe)](#菜谱接口-recipe)
- [用户组接口 (Group)](#用户组接口-group)
- [订单接口 (Order)](#订单接口-order)

---

## 认证接口 (Auth)

### 1. 微信小程序登录

**接口地址**: `POST /auth/login`

**描述**: 使用微信小程序登录凭证进行登录，返回 JWT token

**请求参数**:
```json
{
  "code": "string" // 微信登录凭证
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "nickname": "用户昵称",
      "avatar_key": "头像key"
    }
  }
}
```

**错误码**:
- `400`: 缺少微信登录凭证
- `500`: 服务器配置错误 / 微信登录失败

---

## 用户接口 (User)

### 1. 编辑用户信息

**接口地址**: `POST /user/edit`

**描述**: 编辑当前登录用户的昵称和头像

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "nickname": "string",      // 可选，用户昵称
  "avatar_key": "string"     // 可选，头像key
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "用户信息更新成功",
  "data": {
    "updated": 1
  }
}
```

**错误码**:
- `400`: 没有可更新的字段
- `401`: 未登录
- `404`: 用户不存在

---

### 2. 查看用户收藏列表

**接口地址**: `POST /user/favorites/list`

**描述**: 获取当前用户的菜谱收藏列表（分页）

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "page": 1,          // 可选，页码，默认1
  "pageSize": 10      // 可选，每页数量，默认10
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "获取收藏列表成功",
  "data": {
    "list": [
      {
        "user_id": "user_id",
        "recipe_id": "recipe_id",
        "created_at": "2024-01-01 12:00:00",
        "recipe_name": "菜谱名称",
        "recipe_description": "菜谱描述",
        "recipe_cover_image_key": "封面图key",
        "recipe_user_id": "创建者id",
        "recipe_is_public": 1
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

**错误码**:
- `401`: 未登录

---

### 3. 添加收藏

**接口地址**: `POST /user/favorites/add`

**描述**: 收藏一个菜谱

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "recipe_id": "string"  // 菜谱ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "收藏成功",
  "data": {
    "recipe_id": "recipe_id"
  }
}
```

**错误码**:
- `400`: 缺少菜谱ID
- `401`: 未登录
- `404`: 菜谱不存在

---

### 4. 取消收藏

**接口地址**: `POST /user/favorites/remove`

**描述**: 取消收藏一个菜谱

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "recipe_id": "string"  // 菜谱ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "取消收藏成功",
  "data": {
    "recipe_id": "recipe_id"
  }
}
```

**错误码**:
- `400`: 缺少菜谱ID
- `401`: 未登录
- `404`: 未收藏该菜谱

---

## 菜谱接口 (Recipe)

### 1. 创建菜谱

**接口地址**: `POST /recipe/create`

**描述**: 创建一个新菜谱，ID 由服务器自动生成

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "name": "string",                    // 必填，菜谱名称
  "step_type": "custom|link",          // 必填，步骤类型
  "description": "string",             // 可选，菜谱描述
  "cover_image_key": "string",         // 可选，封面图key
  "steps": "string",                   // 可选，步骤内容（JSON字符串）
  "links": "string",                   // 可选，链接（JSON字符串）
  "is_public": 0|1,                    // 可选，是否公开，默认1
  "tags": ["tag1", "tag2"]             // 可选，标签数组
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "菜谱创建成功",
  "data": {
    "id": "generated_uuid"
  }
}
```

**错误码**:
- `400`: 缺少必填字段 / step_type 值错误
- `401`: 未登录

---

### 2. 菜谱列表查询

**接口地址**: `POST /recipe/list`

**描述**: 分页查询菜谱列表，支持搜索、排序、权限过滤

**请求头**:
```
Authorization: Bearer {token}  // 可选，未登录只能看公开菜谱
```

**请求参数**:
```json
{
  "page": 1,                           // 可选，页码，默认1
  "pageSize": 10,                      // 可选，每页数量，默认10
  "name": "string",                    // 可选，按名称搜索
  "order_by": "view_count|like_count|created_at",  // 可选，排序字段，默认created_at
  "order": "ASC|DESC"                  // 可选，排序方向，默认DESC
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "list": [
      {
        "id": "recipe_id",
        "user_id": "user_id",
        "name": "菜谱名称",
        "description": "菜谱描述",
        "cover_image_key": "封面图key",
        "step_type": "custom",
        "steps": "{}",
        "links": "{}",
        "is_public": 1,
        "view_count": 100,
        "like_count": 50,
        "created_at": "2024-01-01 12:00:00",
        "updated_at": "2024-01-01 12:00:00"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

**权限说明**:
- 未登录用户：只能看到公开的菜谱
- 已登录用户：可以看到公开的菜谱 + 自己的菜谱 + 家庭组成员的菜谱

---

### 3. 获取菜谱详情

**接口地址**: `POST /recipe/detail`

**描述**: 获取菜谱详细信息，包括关联的标签

**请求参数**:
```json
{
  "id": "string"  // 菜谱ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "id": "recipe_id",
    "user_id": "user_id",
    "name": "菜谱名称",
    "description": "菜谱描述",
    "cover_image_key": "封面图key",
    "step_type": "custom",
    "steps": "{}",
    "links": "{}",
    "is_public": 1,
    "view_count": 100,
    "like_count": 50,
    "created_at": "2024-01-01 12:00:00",
    "updated_at": "2024-01-01 12:00:00",
    "tags": ["tag1", "tag2"]
  }
}
```

**错误码**:
- `400`: 缺少菜谱ID
- `404`: 菜谱不存在

---

### 4. 更新菜谱

**接口地址**: `POST /recipe/edit`

**描述**: 更新菜谱信息，只能编辑自己的菜谱

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "id": "string",                      // 必填，菜谱ID
  "name": "string",                    // 可选，菜谱名称
  "description": "string",             // 可选，菜谱描述
  "cover_image_key": "string",         // 可选，封面图key
  "step_type": "custom|link",          // 可选，步骤类型
  "steps": "string",                   // 可选，步骤内容
  "links": "string",                   // 可选，链接
  "is_public": 0|1,                    // 可选，是否公开
  "tags": ["tag1", "tag2"]             // 可选，标签数组
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "菜谱更新成功",
  "data": {
    "updated": 1
  }
}
```

**错误码**:
- `400`: 缺少菜谱ID
- `403`: 无权编辑此菜谱
- `404`: 菜谱不存在

---

### 5. 删除菜谱

**接口地址**: `POST /recipe/delete`

**描述**: 删除菜谱，只能删除自己的菜谱

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "id": "string"  // 菜谱ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "菜谱删除成功",
  "data": {
    "deleted": 1
  }
}
```

**错误码**:
- `400`: 缺少菜谱ID
- `403`: 无权删除此菜谱
- `404`: 菜谱不存在

---

### 6. 获取所有标签

**接口地址**: `POST /recipe/tags`

**描述**: 获取所有标签列表，可选择是否包含使用次数

**请求参数**:
```json
{
  "with_count": true  // 可选，是否包含使用次数
}
```

**响应示例（with_count=true）**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "tags": [
      {
        "name": "tag1",
        "recipe_count": 10
      }
    ],
    "total": 5
  }
}
```

**响应示例（with_count=false）**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "tags": ["tag1", "tag2", "tag3"],
    "total": 3
  }
}
```

---

## 用户组接口 (Group)

### 1. 创建用户组

**接口地址**: `POST /group/create`

**描述**: 创建一个新的用户组，创建者自动成为 owner

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "name": "string",                    // 可选，组名称
  "avatar_key": "string",              // 可选，组头像key
  "group_type": "family|partner"       // 可选，组类型，默认family
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "用户组创建成功",
  "data": {
    "group_id": "generated_uuid"
  }
}
```

**错误码**:
- `401`: 未登录

---

### 2. 编辑用户组信息

**接口地址**: `POST /group/edit`

**描述**: 编辑用户组信息，需要管理权限

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "group_id": "string",                // 必填，组ID
  "name": "string",                    // 可选，组名称
  "avatar_key": "string",              // 可选，组头像key
  "group_type": "family|partner"       // 可选，组类型
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "用户组信息更新成功",
  "data": {
    "updated": 1
  }
}
```

**错误码**:
- `400`: 缺少组ID / 没有可更新的字段
- `401`: 未登录
- `403`: 无权限管理该用户组
- `404`: 用户组不存在

---

### 3. 删除用户组

**接口地址**: `POST /group/delete`

**描述**: 删除用户组，只有 owner 可以删除

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "group_id": "string"  // 组ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "用户组删除成功"
}
```

**错误码**:
- `400`: 缺少组ID
- `401`: 未登录
- `403`: 只有创建者可以删除用户组
- `404`: 用户组不存在

---

### 4. 获取我的用户组列表

**接口地址**: `POST /group/my-groups`

**描述**: 获取当前用户所在的所有用户组

**请求头**:
```
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "获取用户组列表成功",
  "data": {
    "list": [
      {
        "id": "group_id",
        "name": "组名称",
        "avatar_key": "头像key",
        "group_type": "family",
        "created_at": "2024-01-01 12:00:00",
        "updated_at": "2024-01-01 12:00:00",
        "role": "owner",
        "can_manage": 1,
        "joined_at": "2024-01-01 12:00:00"
      }
    ]
  }
}
```

**错误码**:
- `401`: 未登录

---

### 5. 获取用户组详情

**接口地址**: `POST /group/detail`

**描述**: 获取用户组详细信息，包括所有成员

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "group_id": "string"  // 组ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "获取用户组详情成功",
  "data": {
    "group": {
      "id": "group_id",
      "name": "组名称",
      "avatar_key": "头像key",
      "group_type": "family",
      "created_at": "2024-01-01 12:00:00",
      "updated_at": "2024-01-01 12:00:00"
    },
    "members": [
      {
        "group_id": "group_id",
        "user_id": "user_id",
        "role": "owner",
        "can_manage": 1,
        "joined_at": "2024-01-01 12:00:00",
        "nickname": "用户昵称",
        "avatar_key": "用户头像key"
      }
    ]
  }
}
```

**错误码**:
- `400`: 缺少组ID
- `401`: 未登录
- `403`: 无权限查看该用户组
- `404`: 用户组不存在

---

### 6. 添加成员到用户组

**接口地址**: `POST /group/members/add`

**描述**: 添加新成员到用户组，需要管理权限

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "group_id": "string",                // 必填，组ID
  "target_user_id": "string",          // 必填，目标用户ID
  "role": "owner|member",              // 可选，角色，默认member
  "can_manage": 0|1                    // 可选，是否有管理权限，默认0
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "添加成员成功",
  "data": {
    "user_id": "target_user_id"
  }
}
```

**错误码**:
- `400`: 缺少必要参数 / 该用户已在组中
- `401`: 未登录
- `403`: 无权限管理该用户组
- `404`: 目标用户不存在

---

### 7. 移除用户组成员

**接口地址**: `POST /group/members/remove`

**描述**: 从用户组移除成员，需要管理权限，不能移除 owner

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "group_id": "string",                // 必填，组ID
  "target_user_id": "string"           // 必填，目标用户ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "移除成员成功"
}
```

**错误码**:
- `400`: 缺少必要参数
- `401`: 未登录
- `403`: 无权限管理该用户组 / 不能移除创建者
- `404`: 该用户不在组中

---

### 8. 更新成员权限

**接口地址**: `POST /group/members/update`

**描述**: 更新成员的角色和权限，需要管理权限，不能修改 owner

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "group_id": "string",                // 必填，组ID
  "target_user_id": "string",          // 必填，目标用户ID
  "role": "owner|member",              // 可选，角色
  "can_manage": 0|1                    // 可选，是否有管理权限
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "成员权限更新成功",
  "data": {
    "updated": 1
  }
}
```

**错误码**:
- `400`: 缺少必要参数 / 没有可更新的字段
- `401`: 未登录
- `403`: 无权限管理该用户组 / 不能修改创建者的权限
- `404`: 该用户不在组中

---

### 9. 退出用户组

**接口地址**: `POST /group/leave`

**描述**: 退出用户组，owner 不能退出

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "group_id": "string"  // 组ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "退出用户组成功"
}
```

**错误码**:
- `400`: 缺少组ID
- `401`: 未登录
- `403`: 创建者不能退出，请删除用户组
- `404`: 你不在该用户组中

---

## 订单接口 (Order)

### 1. 创建订单

**接口地址**: `POST /order/create`

**描述**: 创建新订单，ID 和订单号由服务器自动生成

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "target_time": "string",             // 可选，目标时间
  "remark": "string",                  // 可选，备注
  "recipes": [                         // 可选，关联的菜谱
    {
      "recipe_id": "string",
      "quantity": 1                    // 可选，数量，默认1
    }
  ]
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "订单创建成功",
  "data": {
    "id": "generated_uuid",
    "order_no": "ORD20240101120000123"
  }
}
```

**错误码**:
- `400`: 缺少用户认证信息

---

### 2. 编辑订单状态

**接口地址**: `POST /order/edit`

**描述**: 更新订单状态，只能编辑自己的订单

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "id": "string",                      // 必填，订单ID
  "status": "pending|completed|timeout"  // 必填，订单状态
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "订单状态更新成功",
  "data": {
    "updated": 1
  }
}
```

**错误码**:
- `400`: 缺少订单ID / 缺少状态字段 / 状态值错误
- `403`: 无权编辑此订单
- `404`: 订单不存在

---

### 3. 订单列表查询

**接口地址**: `POST /order/list`

**描述**: 分页查询订单列表，支持状态筛选和排序

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "page": 1,                           // 可选，页码，默认1
  "pageSize": 10,                      // 可选，每页数量，默认10
  "status": "pending|completed|timeout",  // 可选，按状态筛选
  "order_by": "created_at|target_time",   // 可选，排序字段，默认created_at
  "order": "ASC|DESC"                  // 可选，排序方向，默认DESC
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "list": [
      {
        "id": "order_id",
        "user_id": "user_id",
        "order_no": "ORD20240101120000123",
        "status": "pending",
        "target_time": "2024-01-01 18:00:00",
        "remark": "备注",
        "created_at": "2024-01-01 12:00:00",
        "user_nickname": "用户昵称",
        "user_avatar_key": "用户头像key"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

**权限说明**:
- 只能看到自己的订单 + 同组成员的订单

**错误码**:
- `401`: 未登录

---

### 4. 订单详情查询

**接口地址**: `POST /order/detail`

**描述**: 获取订单详细信息，包括关联的菜谱

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "id": "string"  // 订单ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "order": {
      "id": "order_id",
      "user_id": "user_id",
      "order_no": "ORD20240101120000123",
      "status": "pending",
      "target_time": "2024-01-01 18:00:00",
      "remark": "备注",
      "created_at": "2024-01-01 12:00:00",
      "user_nickname": "用户昵称",
      "user_avatar_key": "用户头像key"
    },
    "recipes": [
      {
        "order_id": "order_id",
        "recipe_id": "recipe_id",
        "quantity": 1,
        "recipe_name": "菜谱名称",
        "recipe_description": "菜谱描述",
        "recipe_cover_image_key": "封面图key",
        "recipe_step_type": "custom"
      }
    ]
  }
}
```

**错误码**:
- `400`: 缺少订单ID
- `401`: 未登录
- `403`: 无权查看此订单
- `404`: 订单不存在

---

### 5. 创建订单评价

**接口地址**: `POST /order/review/create`

**描述**: 为订单创建评价，每个用户对每个订单只能评价一次

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "order_id": "string",                // 必填，订单ID
  "rating": 5,                         // 可选，评分（1-5）
  "content": "string",                 // 可选，评价内容
  "images": "string"                   // 可选，图片（JSON字符串）
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "评价创建成功",
  "data": {
    "id": "review_id"
  }
}
```

**错误码**:
- `400`: 缺少订单ID / 评分必须在1-5之间 / 已评价过该订单
- `401`: 未登录
- `403`: 无权评价此订单
- `404`: 订单不存在

---

### 6. 删除订单评价

**接口地址**: `POST /order/review/delete`

**描述**: 删除订单评价，只能删除自己的评价

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "id": "string"  // 评价ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "评价删除成功",
  "data": {
    "deleted": 1
  }
}
```

**错误码**:
- `400`: 缺少评价ID
- `401`: 未登录
- `403`: 无权删除此评价
- `404`: 评价不存在

---

### 7. 查询订单的所有评价

**接口地址**: `POST /order/review/list`

**描述**: 获取订单的所有评价列表

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "order_id": "string"  // 订单ID
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "list": [
      {
        "id": "review_id",
        "order_id": "order_id",
        "user_id": "user_id",
        "rating": 5,
        "content": "评价内容",
        "images": "{}",
        "created_at": "2024-01-01 12:00:00",
        "user_nickname": "用户昵称",
        "user_avatar_key": "用户头像key"
      }
    ],
    "total": 5
  }
}
```

**错误码**:
- `400`: 缺少订单ID
- `401`: 未登录
- `403`: 无权查看此订单的评价

---

## 通用响应格式

所有接口都遵循统一的响应格式：

```json
{
  "code": 200,           // 状态码
  "message": "string",   // 提示信息
  "data": {}             // 响应数据（可选）
}
```

## 通用状态码

- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权/未登录
- `403`: 无权限
- `404`: 资源不存在
- `500`: 服务器错误

## 认证说明

除了 `/auth/login` 和部分公开接口外，其他接口都需要在请求头中携带 JWT token：

```
Authorization: Bearer {token}
```

Token 通过登录接口获取，有效期为 7 天。
