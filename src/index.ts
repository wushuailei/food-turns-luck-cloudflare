import { router } from './routers';
import { ROUTER_WHITE_LIST, RESPONSE_CODE } from './constants/index';
import { verifyToken } from './utils/jwt';
import { createResponse } from './utils/index';
import { createModel } from './utils/db'; // Added createModel

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// 鉴权检查
		const path = new URL(request.url).pathname;
		if (!ROUTER_WHITE_LIST.includes(path)) {
			const authHeader = request.headers.get('Authorization');
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				return createResponse({
					code: RESPONSE_CODE.UNAUTHORIZED,
					message: '缺少登录凭证',
				});
			}

			const token = authHeader.substring(7);
			const payload = await verifyToken(token);
			if (!payload) {
				return createResponse({
					code: RESPONSE_CODE.UNAUTHORIZED,
					message: '登录凭证无效或已过期',
				});
			}

			// 检查用户是否存在
			const userModel = createModel<{ id: string }>(env.food_turns_luck_d1 as unknown as D1Database, 'users');
			const user = await userModel.findOne({ id: payload.openid });
			if (!user) {
				return createResponse({
					code: RESPONSE_CODE.UNAUTHORIZED,
					message: '用户不存在',
				});
			}

			// 将用户信息附加到 request 上（供后续路由使用）
			(request as any).user = { id: payload.openid };
		}

		return router.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
