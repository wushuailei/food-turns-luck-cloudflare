import { router } from './routers';
import { ROUTER_WHITE_LIST, RESPONSE_CODE } from './constants/index';
import { verifyToken } from './utils/jwt';
import { createResponse } from './utils/index';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const path = new URL(request.url).pathname;
		if (!ROUTER_WHITE_LIST.includes(path)) {
			const authHeader = request.headers.get('Authorization');
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				return createResponse({
					code: RESPONSE_CODE.UNAUTHORIZED,
				});
			}
			const token = authHeader.substring(7);
			const payload = await verifyToken(token);
			if (!payload) {
				return createResponse({
					code: RESPONSE_CODE.UNAUTHORIZED,
				});
			}
		}
		return router.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
