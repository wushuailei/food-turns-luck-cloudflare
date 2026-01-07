# 接口鉴权说明

## 🔒 鉴权机制

所有接口（除白名单外）都需要携带有效的 JWT token，并且用户必须在数据库中存在。

## 📋 白名单接口

以下接口无需鉴权：

```typescript
['/auth/login']  // 微信登录接口
```

## 🔑 鉴权流程

```
1. 检查路径是否在白名单中
   ↓ 不在白名单
2. 检查 Authorization header
   ↓ 存在且格式正确
3. 验证 JWT token
   ↓ token 有效
4. 查询用户是否存在于数据库
   ↓ 用户存在
5. 将用户信息附加到 request
   ↓
6. 继续处理请求
```

## 📡 客户端调用示例

### 小程序端

```javascript
// 1. 登录获取 token
wx.login({
  success: (res) => {
    wx.request({
      url: 'https://your-domain.com/auth/login',
      method: 'POST',
      data: { code: res.code },
      success: (response) => {
        // 保存 token
        wx.setStorageSync('token', response.data.data.token);
      }
    });
  }
});

// 2. 调用需要鉴权的接口
wx.request({
  url: 'https://your-domain.com/user/edit',
  method: 'POST',
  header: {
    'Authorization': 'Bearer ' + wx.getStorageSync('token')  // ✅ 携带 token
  },
  data: {
    id: 'user_openid',
    nickname: '新昵称'
  }
});
```

## ❌ 错误响应

### 1. 缺少登录凭证

```json
{
  "code": 401,
  "message": "缺少登录凭证"
}
```

**原因**：
- 未携带 `Authorization` header
- `Authorization` header 格式错误（不是 `Bearer xxx`）

### 2. 登录凭证无效或已过期

```json
{
  "code": 401,
  "message": "登录凭证无效或已过期"
}
```

**原因**：
- Token 签名验证失败
- Token 已过期（默认 7 天）
- Token 格式错误

### 3. 用户不存在

```json
{
  "code": 401,
  "message": "用户不存在"
}
```

**原因**：
- Token 有效，但用户已从数据库中删除
- Token 中的 openid 在数据库中不存在

## 🔧 后端获取当前用户

在通过鉴权后，可以从 request 中获取用户信息：

```typescript
// 在路由处理函数中
const currentUser = (request as any).user;
console.log(currentUser.id);  // 用户的 openid
```

## 📝 Token 有效期

- 默认有效期：**7 天**
- 过期后需要重新登录
- 可在 `src/routers/auth.ts` 中修改：

```typescript
const token = await signToken(wxData.openid, '7d');  // 修改这里
```

可选值：
- `'1h'` - 1 小时
- `'1d'` - 1 天
- `'7d'` - 7 天
- `'30d'` - 30 天

## 🛡️ 安全建议

1. **HTTPS**：生产环境必须使用 HTTPS
2. **Token 存储**：小程序端使用 `wx.setStorageSync` 安全存储
3. **Token 刷新**：建议实现 token 刷新机制
4. **敏感操作**：重要操作可以要求重新验证
