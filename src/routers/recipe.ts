import { Router } from 'itty-router';
import { createResponse } from '../utils/index';
import { createModel } from '../utils/db';
import { RESPONSE_CODE } from '../constants/index';
import type { Recipe, RecipeCreateFields, RecipeEditableFields } from '../types/recipe';

// 创建菜谱路由器
export const recipeRouter = Router();
// 基础路由
export const recipeBasePath = '/recipe' as const;

// 生成 UUID v4
function generateId(): string {
	return crypto.randomUUID();
}

// 创建菜谱
recipeRouter.post(`${recipeBasePath}/create`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const recipeModel = createModel<Recipe>(env.food_turns_luck_d1 as unknown as D1Database, 'recipes');
		const tagModel = createModel<{ name: string }>(env.food_turns_luck_d1 as unknown as D1Database, 'tags');

		// 解析请求体
		const body = (await request.json()) as RecipeCreateFields & { tags?: string[] };

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		// 验证必填字段
		if (!userId || !body.name || !body.step_type) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少必填字段：name, step_type',
			});
		}

		// 验证 step_type
		if (body.step_type !== 'custom' && body.step_type !== 'link') {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: 'step_type 必须是 custom 或 link',
			});
		}

		// 自动生成菜谱 ID
		const recipeId = generateId();

		// 创建菜谱记录
		const recipeData: RecipeCreateFields = {
			id: recipeId,
			user_id: userId,
			name: body.name,
			step_type: body.step_type,
			description: body.description,
			cover_image_key: body.cover_image_key,
			steps: body.steps,
			links: body.links,
			is_public: body.is_public ?? 1,
		};

		await recipeModel.create(recipeData);

		// 处理标签
		if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
			const db = env.food_turns_luck_d1 as unknown as D1Database;

			for (const tagName of body.tags) {
				// 检查标签是否存在，不存在则创建
				const tagExists = await tagModel.exists({ name: tagName });
				if (!tagExists) {
					await tagModel.create({ name: tagName });
				}

				// 创建菜谱-标签关联
				await db.prepare('INSERT INTO recipe_tags (recipe_id, tag_name) VALUES (?, ?)').bind(recipeId, tagName).run();
			}
		}

		return createResponse({
			message: '菜谱创建成功',
			data: { id: recipeId },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 分页查询菜谱列表（支持排序、筛选、家庭组）
recipeRouter.post(`${recipeBasePath}/list`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const db = env.food_turns_luck_d1 as unknown as D1Database;

		// 解析请求体
		const body = (await request.json()) as {
			page?: number;
			pageSize?: number;
			name?: string; // 按名称搜索
			order_by?: 'view_count' | 'like_count' | 'created_at'; // 排序字段
			order?: 'ASC' | 'DESC'; // 排序方向
		};

		// 从鉴权中间件获取当前用户ID
		const currentUserId = (request as any).user?.id;

		const page = body.page || 1;
		const pageSize = body.pageSize || 10;
		const offset = (page - 1) * pageSize;
		const orderBy = body.order_by || 'created_at';
		const order = body.order || 'DESC';

		// 构建 WHERE 条件
		const conditions: string[] = [];
		const params: unknown[] = [];

		// 权限控制：只能看到公开的菜谱 + 自己的菜谱 + 家庭组成员的菜谱
		if (currentUserId) {
			conditions.push(
				`(
					r.is_public = 1 
					OR r.user_id = ? 
					OR r.user_id IN (
					SELECT m2.user_id 
					FROM user_group_members m1
					INNER JOIN user_group_members m2 ON m1.group_id = m2.group_id
					WHERE m1.user_id = ? AND m2.user_id != ?
				)
				)`,
			);
			params.push(currentUserId, currentUserId, currentUserId);
		} else {
			// 未登录用户只能看公开的菜谱
			conditions.push('r.is_public = 1');
		}

		// 名称搜索
		if (body.name) {
			conditions.push('r.name LIKE ?');
			params.push(`%${body.name}%`);
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		// 查询数据
		const dataQuery = `
			SELECT r.* 
			FROM recipes r
			${whereClause}
			ORDER BY r.${orderBy} ${order}
			LIMIT ? OFFSET ?
		`;

		const dataResult = await db
			.prepare(dataQuery)
			.bind(...params, pageSize, offset)
			.all<Recipe>();

		// 查询总数
		const countQuery = `
			SELECT COUNT(*) as count 
			FROM recipes r
			${whereClause}
		`;

		const countResult = await db
			.prepare(countQuery)
			.bind(...params)
			.first<{ count: number }>();

		const total = countResult?.count || 0;

		return createResponse({
			message: '查询成功',
			data: {
				list: dataResult.results || [],
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

// 获取菜谱详情
recipeRouter.post(`${recipeBasePath}/detail`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const recipeModel = createModel<Recipe>(env.food_turns_luck_d1 as unknown as D1Database, 'recipes');
		const db = env.food_turns_luck_d1 as unknown as D1Database;

		// 解析请求体
		const body = (await request.json()) as { id: string };

		if (!body.id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少菜谱ID',
			});
		}

		// 查询菜谱
		const recipe = await recipeModel.findById(body.id);

		if (!recipe) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '菜谱不存在',
			});
		}

		// 查询关联的标签
		const tagsResult = await db.prepare('SELECT tag_name FROM recipe_tags WHERE recipe_id = ?').bind(body.id).all<{ tag_name: string }>();

		const tags = tagsResult.results?.map((row) => row.tag_name) || [];

		return createResponse({
			message: '查询成功',
			data: {
				...recipe,
				tags,
			},
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 更新菜谱
recipeRouter.post(`${recipeBasePath}/edit`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const recipeModel = createModel<Recipe>(env.food_turns_luck_d1 as unknown as D1Database, 'recipes');
		const tagModel = createModel<{ name: string }>(env.food_turns_luck_d1 as unknown as D1Database, 'tags');
		const db = env.food_turns_luck_d1 as unknown as D1Database;

		// 解析请求体
		const body = (await request.json()) as { id: string; tags?: string[] } & RecipeEditableFields;

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!body.id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少菜谱ID',
			});
		}

		// 验证权限：只能编辑自己的菜谱
		const recipe = await recipeModel.findById(body.id);
		if (!recipe) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '菜谱不存在',
			});
		}

		if (recipe.user_id !== userId) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权编辑此菜谱',
			});
		}

		// 构建可编辑数据
		const editableData: RecipeEditableFields = {
			updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
		};

		if (body.name !== undefined) editableData.name = body.name;
		if (body.description !== undefined) editableData.description = body.description;
		if (body.cover_image_key !== undefined) editableData.cover_image_key = body.cover_image_key;
		if (body.step_type !== undefined) editableData.step_type = body.step_type;
		if (body.steps !== undefined) editableData.steps = body.steps;
		if (body.links !== undefined) editableData.links = body.links;
		if (body.is_public !== undefined) editableData.is_public = body.is_public;

		// 更新菜谱基本信息
		const result = await recipeModel.update({ id: body.id }, editableData);

		// 处理标签更新
		if (body.tags && Array.isArray(body.tags)) {
			// 删除旧的标签关联
			await db.prepare('DELETE FROM recipe_tags WHERE recipe_id = ?').bind(body.id).run();

			// 创建新的标签关联
			for (const tagName of body.tags) {
				// 检查标签是否存在，不存在则创建
				const tagExists = await tagModel.exists({ name: tagName });
				if (!tagExists) {
					await tagModel.create({ name: tagName });
				}

				// 创建菜谱-标签关联
				await db.prepare('INSERT INTO recipe_tags (recipe_id, tag_name) VALUES (?, ?)').bind(body.id, tagName).run();
			}
		}

		return createResponse({
			message: '菜谱更新成功',
			data: { updated: result.changes },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 删除菜谱
recipeRouter.post(`${recipeBasePath}/delete`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const recipeModel = createModel<Recipe>(env.food_turns_luck_d1 as unknown as D1Database, 'recipes');

		// 解析请求体
		const body = (await request.json()) as { id: string };

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!body.id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少菜谱ID',
			});
		}

		// 验证权限：只能删除自己的菜谱
		const recipe = await recipeModel.findById(body.id);
		if (!recipe) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '菜谱不存在',
			});
		}

		if (recipe.user_id !== userId) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权删除此菜谱',
			});
		}

		// 删除菜谱（级联删除会自动删除关联的标签）
		const result = await recipeModel.delete({ id: body.id });

		return createResponse({
			message: '菜谱删除成功',
			data: { deleted: result.changes },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 获取所有标签
recipeRouter.post(`${recipeBasePath}/tags`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const db = env.food_turns_luck_d1 as unknown as D1Database;

		// 解析请求体
		const body = (await request.json().catch(() => ({}))) as { with_count?: boolean };

		if (body.with_count) {
			// 返回标签及其使用次数
			const result = await db
				.prepare(
					`SELECT t.name, COUNT(rt.recipe_id) as recipe_count
					 FROM tags t
					 LEFT JOIN recipe_tags rt ON t.name = rt.tag_name
					 GROUP BY t.name
					 ORDER BY recipe_count DESC, t.name ASC`,
				)
				.all<{ name: string; recipe_count: number }>();

			return createResponse({
				message: '查询成功',
				data: {
					tags: result.results || [],
					total: result.results?.length || 0,
				},
			});
		} else {
			// 只返回标签名称列表
			const result = await db.prepare('SELECT name FROM tags ORDER BY name ASC').all<{ name: string }>();

			const tags = result.results?.map((row) => row.name) || [];

			return createResponse({
				message: '查询成功',
				data: {
					tags,
					total: tags.length,
				},
			});
		}
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});
