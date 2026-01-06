import { Router } from 'itty-router';

// 创建用户路由器
export const userRouter = Router();

// 获取所有用户（需要认证）
userRouter.get('/', async (request) => {
	// 模拟用户数据
	const users = [
		{ id: 1, name: 'Alice', email: 'alice@example.com' },
		{ id: 2, name: 'Bob', email: 'bob@example.com' },
	];

	return new Response(
		JSON.stringify({
			success: true,
			data: users,
		}),
		{
			headers: { 'Content-Type': 'application/json' },
		}
	);
});
