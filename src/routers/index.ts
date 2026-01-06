import { Router } from 'itty-router';
import { userRouter } from './user';

// 创建主路由器
const router = Router();

// 挂载用户路由
router.all('/api/users/*', userRouter.handle);
// 404 处理
router.all('*', () => {
	return new Response(
		JSON.stringify({
			error: 'Not Found',
		}),
		{
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		}
	);
});

export { router };
