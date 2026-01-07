import { RequestLike, Router } from 'itty-router';
import { userRouter, userBasePath } from './user';
import { authRouter, authBasePath } from './auth';
import { recipeRouter, recipeBasePath } from './recipe';
import { createResponse } from '../utils/index';
import { RESPONSE_CODE } from '../constants/index';

// 创建主路由器
const router = Router();

// 挂载登录路由
router.all(`${authBasePath}/*`, (request: RequestLike, env: Env, ctx) => {
	return authRouter.fetch(request, env, ctx);
});

// 挂载用户路由
router.all(`${userBasePath}/*`, (request: RequestLike, env: Env, ctx) => {
	return userRouter.fetch(request, env, ctx);
});

// 挂载菜谱路由
router.all(`${recipeBasePath}/*`, (request: RequestLike, env: Env, ctx) => {
	return recipeRouter.fetch(request, env, ctx);
});

// 404 处理
router.all('*', () => {
	return createResponse({
		code: RESPONSE_CODE.NOT_FOUND,
	});
});

export { router };
