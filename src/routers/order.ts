import { Router } from 'itty-router';
import { createResponse } from '../utils/index';
import { createModel } from '../utils/db';
import { RESPONSE_CODE } from '../constants/index';
import type { Order, OrderCreateFields, OrderEditableFields } from '../types/order';
import type { OrderReview, OrderReviewCreateFields, OrderReviewEditableFields } from '../types/review';

// 创建订单路由器
export const orderRouter = Router();
// 基础路由
export const orderBasePath = '/order' as const;

// 生成 UUID v4
function generateUUID(): string {
	return crypto.randomUUID();
}

// 生成订单号
function generateOrderNo(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
	return `ORD${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

// 创建订单
orderRouter.post(`${orderBasePath}/create`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const orderModel = createModel<Order>(env.food_turns_luck_d1 as unknown as D1Database, 'orders');
		const db = env.food_turns_luck_d1 as unknown as D1Database;

		// 解析请求体
		const body = (await request.json()) as OrderCreateFields & {
			recipes?: Array<{ recipe_id: string; quantity?: number }>;
		};

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		// 验证必填字段
		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少用户认证信息',
			});
		}

		// 自动生成订单 ID 和订单号
		const orderId = generateUUID();
		const orderNo = generateOrderNo();

		// 创建订单记录
		const orderData: OrderCreateFields = {
			id: orderId,
			user_id: userId,
			order_no: orderNo,
			target_time: body.target_time,
			remark: body.remark,
		};

		await orderModel.create(orderData);

		// 处理订单-菜谱关联
		if (body.recipes && Array.isArray(body.recipes) && body.recipes.length > 0) {
			for (const recipe of body.recipes) {
				const quantity = recipe.quantity ?? 1;
				await db
					.prepare('INSERT INTO order_recipes (order_id, recipe_id, quantity) VALUES (?, ?, ?)')
					.bind(orderId, recipe.recipe_id, quantity)
					.run();
			}
		}

		return createResponse({
			message: '订单创建成功',
			data: { id: orderId, order_no: orderNo },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 编辑订单状态
orderRouter.post(`${orderBasePath}/edit`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const orderModel = createModel<Order>(env.food_turns_luck_d1 as unknown as D1Database, 'orders');

		// 解析请求体
		const body = (await request.json()) as { id: string; status: 'pending' | 'completed' | 'timeout' };

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!body.id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少订单ID',
			});
		}

		if (!body.status) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少状态字段',
			});
		}

		// 验证状态值
		if (!['pending', 'completed', 'timeout'].includes(body.status)) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '状态值必须是 pending、completed 或 timeout',
			});
		}

		// 验证权限：只能编辑自己的订单
		const order = await orderModel.findById(body.id);
		if (!order) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '订单不存在',
			});
		}

		if (order.user_id !== userId) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权编辑此订单',
			});
		}

		// 更新订单状态
		const editableData: OrderEditableFields = {
			status: body.status,
		};

		const result = await orderModel.update({ id: body.id }, editableData);

		return createResponse({
			message: '订单状态更新成功',
			data: { updated: result.changes },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 订单列表查询（支持分页、筛选、排序）
orderRouter.post(`${orderBasePath}/list`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const db = env.food_turns_luck_d1 as unknown as D1Database;

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json().catch(() => ({}))) as {
			page?: number;
			pageSize?: number;
			status?: 'pending' | 'completed' | 'timeout'; // 按状态筛选
			order_by?: 'created_at' | 'target_time'; // 排序字段
			order?: 'ASC' | 'DESC'; // 排序方向
		};

		const page = body.page || 1;
		const pageSize = body.pageSize || 10;
		const offset = (page - 1) * pageSize;
		const orderBy = body.order_by || 'created_at';
		const order = body.order || 'DESC';

		// 构建 WHERE 条件
		const conditions: string[] = [];
		const params: unknown[] = [];

		// 权限控制：只能看到自己的订单 + 同组成员的订单
		conditions.push(
			`(
				o.user_id = ? 
				OR o.user_id IN (
					SELECT m2.user_id 
					FROM user_group_members m1
					INNER JOIN user_group_members m2 ON m1.group_id = m2.group_id
					WHERE m1.user_id = ? AND m2.user_id != ?
				)
			)`,
		);
		params.push(userId, userId, userId);

		// 状态筛选
		if (body.status) {
			conditions.push('o.status = ?');
			params.push(body.status);
		}

		const whereClause = `WHERE ${conditions.join(' AND ')}`;

		// 查询订单数据（联表查询用户信息）
		const dataQuery = `
			SELECT 
				o.*,
				u.nickname as user_nickname,
				u.avatar_key as user_avatar_key
			FROM orders o
			LEFT JOIN users u ON o.user_id = u.id
			${whereClause}
			ORDER BY o.${orderBy} ${order}
			LIMIT ? OFFSET ?
		`;

		const dataResult = await db
			.prepare(dataQuery)
			.bind(...params, pageSize, offset)
			.all();

		// 查询总数
		const countQuery = `
			SELECT COUNT(*) as count 
			FROM orders o
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

// 订单详情查询（包括关联的菜谱）
orderRouter.post(`${orderBasePath}/detail`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const db = env.food_turns_luck_d1 as unknown as D1Database;

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as { id: string };

		if (!body.id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少订单ID',
			});
		}

		// 查询订单基本信息（联表查询用户信息）
		const orderQuery = `
			SELECT 
				o.*,
				u.nickname as user_nickname,
				u.avatar_key as user_avatar_key
			FROM orders o
			LEFT JOIN users u ON o.user_id = u.id
			WHERE o.id = ?
		`;

		const orderResult = await db.prepare(orderQuery).bind(body.id).first();

		if (!orderResult) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '订单不存在',
			});
		}

		// 权限验证：只能查看自己的订单或同组成员的订单
		const permissionQuery = `
			SELECT 1 FROM orders o
			WHERE o.id = ? AND (
				o.user_id = ? 
				OR o.user_id IN (
					SELECT m2.user_id 
					FROM user_group_members m1
					INNER JOIN user_group_members m2 ON m1.group_id = m2.group_id
					WHERE m1.user_id = ? AND m2.user_id != ?
				)
			)
		`;

		const hasPermission = await db.prepare(permissionQuery).bind(body.id, userId, userId, userId).first();

		if (!hasPermission) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权查看此订单',
			});
		}

		// 查询订单关联的菜谱
		const recipesQuery = `
			SELECT 
				or_table.order_id,
				or_table.recipe_id,
				or_table.quantity,
				r.name as recipe_name,
				r.description as recipe_description,
				r.cover_image_key as recipe_cover_image_key,
				r.step_type as recipe_step_type
			FROM order_recipes or_table
			INNER JOIN recipes r ON or_table.recipe_id = r.id
			WHERE or_table.order_id = ?
		`;

		const recipesResult = await db.prepare(recipesQuery).bind(body.id).all();

		return createResponse({
			message: '查询成功',
			data: {
				order: orderResult,
				recipes: recipesResult.results || [],
			},
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// ==================== 订单评价相关接口 ====================

// 创建订单评价
orderRouter.post(`${orderBasePath}/review/create`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const reviewModel = createModel<OrderReview>(env.food_turns_luck_d1 as unknown as D1Database, 'order_reviews');
		const orderModel = createModel<Order>(env.food_turns_luck_d1 as unknown as D1Database, 'orders');
		const db = env.food_turns_luck_d1 as unknown as D1Database;

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as {
			order_id: string;
			rating?: number;
			content?: string;
			images?: string;
		};

		if (!body.order_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少订单ID',
			});
		}

		// 验证评分范围
		if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '评分必须在1-5之间',
			});
		}

		// 检查订单是否存在
		const order = await orderModel.findById(body.order_id);
		if (!order) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '订单不存在',
			});
		}

		// 权限验证：只能评价自己的订单或同组成员的订单
		const permissionQuery = `
			SELECT 1 FROM orders o
			WHERE o.id = ? AND (
				o.user_id = ? 
				OR o.user_id IN (
					SELECT m2.user_id 
					FROM user_group_members m1
					INNER JOIN user_group_members m2 ON m1.group_id = m2.group_id
					WHERE m1.user_id = ? AND m2.user_id != ?
				)
			)
		`;

		const hasPermission = await db.prepare(permissionQuery).bind(body.order_id, userId, userId, userId).first();

		if (!hasPermission) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权评价此订单',
			});
		}

		// 检查是否已经评价过
		const existingReview = await reviewModel.findOne({
			order_id: body.order_id,
			user_id: userId,
		});

		if (existingReview) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '已评价过该订单',
			});
		}

		// 创建评价
		const reviewId = crypto.randomUUID();
		const reviewData: OrderReviewCreateFields = {
			id: reviewId,
			order_id: body.order_id,
			user_id: userId,
			rating: body.rating,
			content: body.content,
			images: body.images,
		};

		await reviewModel.create(reviewData);

		return createResponse({
			message: '评价创建成功',
			data: { id: reviewId },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 删除订单评价
orderRouter.post(`${orderBasePath}/review/delete`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const reviewModel = createModel<OrderReview>(env.food_turns_luck_d1 as unknown as D1Database, 'order_reviews');

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as { id: string };

		if (!body.id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少评价ID',
			});
		}

		// 检查评价是否存在
		const review = await reviewModel.findById(body.id);
		if (!review) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '评价不存在',
			});
		}

		// 权限验证：只能删除自己的评价
		if (review.user_id !== userId) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权删除此评价',
			});
		}

		// 删除评价
		const result = await reviewModel.delete({ id: body.id });

		return createResponse({
			message: '评价删除成功',
			data: { deleted: result.changes },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 查询订单的所有评价（包含完整详情）
orderRouter.post(`${orderBasePath}/review/list`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const db = env.food_turns_luck_d1 as unknown as D1Database;

		// 从鉴权中间件获取用户ID
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as { order_id: string };

		if (!body.order_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少订单ID',
			});
		}

		// 权限验证：只能查看自己的订单或同组成员的订单的评价
		const permissionQuery = `
			SELECT 1 FROM orders o
			WHERE o.id = ? AND (
				o.user_id = ? 
				OR o.user_id IN (
					SELECT m2.user_id 
					FROM user_group_members m1
					INNER JOIN user_group_members m2 ON m1.group_id = m2.group_id
					WHERE m1.user_id = ? AND m2.user_id != ?
				)
			)
		`;

		const hasPermission = await db.prepare(permissionQuery).bind(body.order_id, userId, userId, userId).first();

		if (!hasPermission) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权查看此订单的评价',
			});
		}

		// 查询评价列表（联表查询用户信息,包含完整详情）
		const reviewsQuery = `
			SELECT 
				r.*,
				u.nickname as user_nickname,
				u.avatar_key as user_avatar_key
			FROM order_reviews r
			LEFT JOIN users u ON r.user_id = u.id
			WHERE r.order_id = ?
			ORDER BY r.created_at DESC
		`;

		const reviewsResult = await db.prepare(reviewsQuery).bind(body.order_id).all();

		return createResponse({
			message: '查询成功',
			data: {
				list: reviewsResult.results || [],
				total: reviewsResult.results?.length || 0,
			},
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});
