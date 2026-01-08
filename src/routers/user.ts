import { Router } from 'itty-router';
import { createResponse } from '../utils/index';
import { createModel } from '../utils/db';
import { RESPONSE_CODE } from '../constants/index';
import type { User, UserEditableFields } from '../types/user';
import type { UserFavorite } from '../types/favorite';
import type { Recipe } from '../types/recipe';

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

// 查看用户收藏列表
userRouter.post(`${userBasePath}/favorites/list`, async (request: Request, env: Env): Promise<Response> => {
	try {
		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体（分页参数）
		const body = (await request.json().catch(() => ({}))) as { page?: number; pageSize?: number };
		const page = body.page || 1;
		const pageSize = body.pageSize || 10;

		// 使用原生 SQL 查询收藏列表（联表查询）
		const offset = (page - 1) * pageSize;
		const query = `
			SELECT 
				f.user_id,
				f.recipe_id,
				f.created_at,
				r.name as recipe_name,
				r.description as recipe_description,
				r.cover_image_key as recipe_cover_image_key,
				r.user_id as recipe_user_id,
				r.is_public as recipe_is_public
			FROM user_favorites f
			INNER JOIN recipes r ON f.recipe_id = r.id
			WHERE f.user_id = ?
			ORDER BY f.created_at DESC
			LIMIT ? OFFSET ?
		`;

		const db = env.food_turns_luck_d1 as unknown as D1Database;
		const stmt = db.prepare(query).bind(userId, pageSize, offset);
		const result = await stmt.all();

		// 查询总数
		const countQuery = `SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ?`;
		const countStmt = db.prepare(countQuery).bind(userId);
		const countResult = await countStmt.first<{ count: number }>();
		const total = countResult?.count || 0;

		return createResponse({
			message: '获取收藏列表成功',
			data: {
				list: result.results || [],
				total,
				page,
				pageSize,
				totalPages: Math.ceil(total / pageSize),
			},
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 添加收藏
userRouter.post(`${userBasePath}/favorites/add`, async (request: Request, env: Env): Promise<Response> => {
	try {
		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as { recipe_id: string };

		if (!body.recipe_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少菜谱ID',
			});
		}

		// 检查菜谱是否存在
		const recipeModel = createModel<Recipe>(env.food_turns_luck_d1 as unknown as D1Database, 'recipes');
		const recipe = await recipeModel.findById(body.recipe_id);

		if (!recipe) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '菜谱不存在',
			});
		}

		// 添加收藏（如果已存在则忽略，保证幂等性）
		const favoriteModel = createModel<UserFavorite>(env.food_turns_luck_d1 as unknown as D1Database, 'user_favorites');

		// 检查是否已收藏
		const existingFavorite = await favoriteModel.findOne({
			user_id: userId,
			recipe_id: body.recipe_id,
		});

		if (existingFavorite) {
			return createResponse({
				message: '已收藏过该菜谱',
				data: { already_exists: true },
			});
		}

		// 创建收藏记录
		await favoriteModel.create({
			user_id: userId,
			recipe_id: body.recipe_id,
		});

		return createResponse({
			message: '收藏成功',
			data: { recipe_id: body.recipe_id },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 取消收藏
userRouter.post(`${userBasePath}/favorites/remove`, async (request: Request, env: Env): Promise<Response> => {
	try {
		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 从请求体获取菜谱ID
		const body = (await request.json()) as { recipe_id: string };

		if (!body.recipe_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少菜谱ID',
			});
		}

		// 删除收藏记录
		const favoriteModel = createModel<UserFavorite>(env.food_turns_luck_d1 as unknown as D1Database, 'user_favorites');
		const result = await favoriteModel.delete({
			user_id: userId,
			recipe_id: body.recipe_id,
		});

		if (result.changes === 0) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '未收藏该菜谱',
			});
		}

		return createResponse({
			message: '取消收藏成功',
			data: { recipe_id: body.recipe_id },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});
