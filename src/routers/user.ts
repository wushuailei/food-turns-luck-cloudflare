import { Router } from 'itty-router';
import { createResponse } from '../utils/index';
import { createModel } from '../utils/db';
import { RESPONSE_CODE } from '../constants/index';
import type { User, UserEditableFields } from '../types/user';

// 创建用户路由器
export const userRouter = Router();
// 基础路由
export const userBasePath = '/user' as const;

// 编辑用户信息（只允许修改 nickname 和 avatar_key）
userRouter.post(`${userBasePath}/edit`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const userModel = createModel<User>(env.food_turns_luck_d1 as unknown as D1Database, 'users');

		// 解析请求体
		const body = (await request.json()) as UserEditableFields;

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 只提取允许编辑的字段
		const editableData: UserEditableFields = {
			updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19), // 更新时间
		};

		if (body.nickname !== undefined) {
			editableData.nickname = body.nickname;
		}
		if (body.avatar_key !== undefined) {
			editableData.avatar_key = body.avatar_key;
		}

		// 检查是否有可更新的字段（除了 updated_at）
		const hasEditableFields = body.nickname !== undefined || body.avatar_key !== undefined;
		if (!hasEditableFields) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '没有可更新的字段',
			});
		}

		// 更新用户信息（只能更新自己的信息）
		const result = await userModel.update({ id: userId }, editableData);

		if (result.changes === 0) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '用户不存在',
			});
		}

		return createResponse({
			message: '用户信息更新成功',
			data: { updated: result.changes },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});
