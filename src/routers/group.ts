import { Router } from 'itty-router';
import { createResponse } from '../utils/index';
import { createModel } from '../utils/db';
import { RESPONSE_CODE } from '../constants/index';
import type { UserGroup, UserGroupEditableFields, UserGroupMember, UserGroupMemberEditableFields } from '../types/group';
import type { User } from '../types/user';

// 创建用户组路由器
export const groupRouter = Router();
// 基础路由
export const groupBasePath = '/group' as const;

// 生成 UUID v4
function generateId(): string {
	return crypto.randomUUID();
}

// 创建用户组
groupRouter.post(`${groupBasePath}/create`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as { name?: string; avatar_key?: string; group_type?: 'family' | 'partner' };

		const groupModel = createModel<UserGroup>(env.food_turns_luck_d1 as unknown as D1Database, 'user_groups');
		const memberModel = createModel<UserGroupMember>(env.food_turns_luck_d1 as unknown as D1Database, 'user_group_members');

		// 创建用户组
		const groupId = generateId();
		const groupData: UserGroup = {
			id: groupId,
			name: body.name,
			avatar_key: body.avatar_key,
			group_type: body.group_type || 'family',
		};

		await groupModel.create(groupData);

		// 将创建者添加为组成员（owner角色，拥有管理权限）
		await memberModel.create({
			group_id: groupId,
			user_id: userId,
			role: 'owner',
			can_manage: 1,
		});

		return createResponse({
			message: '用户组创建成功',
			data: { group_id: groupId },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 编辑用户组信息
groupRouter.post(`${groupBasePath}/edit`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as { group_id: string } & UserGroupEditableFields;

		if (!body.group_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少组ID',
			});
		}

		const groupModel = createModel<UserGroup>(env.food_turns_luck_d1 as unknown as D1Database, 'user_groups');
		const memberModel = createModel<UserGroupMember>(env.food_turns_luck_d1 as unknown as D1Database, 'user_group_members');

		// 检查用户是否有管理权限
		const member = await memberModel.findOne({
			group_id: body.group_id,
			user_id: userId,
		});

		if (!member || member.can_manage !== 1) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权限管理该用户组',
			});
		}

		// 只提取允许编辑的字段
		const editableData: UserGroupEditableFields = {
			updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
		};

		if (body.name !== undefined) {
			editableData.name = body.name;
		}
		if (body.avatar_key !== undefined) {
			editableData.avatar_key = body.avatar_key;
		}
		if (body.group_type !== undefined) {
			editableData.group_type = body.group_type;
		}

		// 检查是否有可更新的字段
		const hasEditableFields = body.name !== undefined || body.avatar_key !== undefined || body.group_type !== undefined;
		if (!hasEditableFields) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '没有可更新的字段',
			});
		}

		// 更新用户组信息
		const result = await groupModel.update({ id: body.group_id }, editableData);

		if (result.changes === 0) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '用户组不存在',
			});
		}

		return createResponse({
			message: '用户组信息更新成功',
			data: { updated: result.changes },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 删除用户组
groupRouter.post(`${groupBasePath}/delete`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as { group_id: string };

		if (!body.group_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少组ID',
			});
		}

		const groupModel = createModel<UserGroup>(env.food_turns_luck_d1 as unknown as D1Database, 'user_groups');
		const memberModel = createModel<UserGroupMember>(env.food_turns_luck_d1 as unknown as D1Database, 'user_group_members');

		// 检查用户是否是组的owner
		const member = await memberModel.findOne({
			group_id: body.group_id,
			user_id: userId,
		});

		if (!member || member.role !== 'owner') {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '只有创建者可以删除用户组',
			});
		}

		// 删除用户组（会级联删除所有成员）
		const result = await groupModel.delete({ id: body.group_id });

		if (result.changes === 0) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '用户组不存在',
			});
		}

		return createResponse({
			message: '用户组删除成功',
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 获取我的用户组列表
groupRouter.post(`${groupBasePath}/my-groups`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 使用原生 SQL 查询用户所在的所有组
		const query = `
			SELECT 
				g.id,
				g.name,
				g.avatar_key,
				g.group_type,
				g.created_at,
				g.updated_at,
				m.role,
				m.can_manage,
				m.joined_at
			FROM user_groups g
			INNER JOIN user_group_members m ON g.id = m.group_id
			WHERE m.user_id = ?
			ORDER BY m.joined_at DESC
		`;

		const db = env.food_turns_luck_d1 as unknown as D1Database;
		const stmt = db.prepare(query).bind(userId);
		const result = await stmt.all();

		return createResponse({
			message: '获取用户组列表成功',
			data: {
				list: result.results || [],
			},
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 获取用户组详情（包括所有成员）
groupRouter.post(`${groupBasePath}/detail`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as { group_id: string };

		if (!body.group_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少组ID',
			});
		}

		const groupModel = createModel<UserGroup>(env.food_turns_luck_d1 as unknown as D1Database, 'user_groups');
		const memberModel = createModel<UserGroupMember>(env.food_turns_luck_d1 as unknown as D1Database, 'user_group_members');

		// 检查用户是否是组成员
		const userMember = await memberModel.findOne({
			group_id: body.group_id,
			user_id: userId,
		});

		if (!userMember) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权限查看该用户组',
			});
		}

		// 获取用户组信息
		const group = await groupModel.findById(body.group_id);

		if (!group) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '用户组不存在',
			});
		}

		// 获取所有成员信息（联表查询用户信息）
		const query = `
			SELECT 
				m.group_id,
				m.user_id,
				m.role,
				m.can_manage,
				m.joined_at,
				u.nickname,
				u.avatar_key
			FROM user_group_members m
			INNER JOIN users u ON m.user_id = u.id
			WHERE m.group_id = ?
			ORDER BY m.role DESC, m.joined_at ASC
		`;

		const db = env.food_turns_luck_d1 as unknown as D1Database;
		const stmt = db.prepare(query).bind(body.group_id);
		const result = await stmt.all();

		return createResponse({
			message: '获取用户组详情成功',
			data: {
				group,
				members: result.results || [],
			},
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 添加成员到用户组
groupRouter.post(`${groupBasePath}/members/add`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as {
			group_id: string;
			target_user_id: string;
			role?: 'owner' | 'member';
			can_manage?: number;
		};

		if (!body.group_id || !body.target_user_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少必要参数',
			});
		}

		const memberModel = createModel<UserGroupMember>(env.food_turns_luck_d1 as unknown as D1Database, 'user_group_members');
		const userModel = createModel<User>(env.food_turns_luck_d1 as unknown as D1Database, 'users');

		// 检查操作者是否有管理权限
		const operatorMember = await memberModel.findOne({
			group_id: body.group_id,
			user_id: userId,
		});

		if (!operatorMember || operatorMember.can_manage !== 1) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权限管理该用户组',
			});
		}

		// 检查目标用户是否存在
		const targetUser = await userModel.findById(body.target_user_id);

		if (!targetUser) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '目标用户不存在',
			});
		}

		// 检查目标用户是否已在组中
		const existingMember = await memberModel.findOne({
			group_id: body.group_id,
			user_id: body.target_user_id,
		});

		if (existingMember) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '该用户已在组中',
			});
		}

		// 添加成员
		await memberModel.create({
			group_id: body.group_id,
			user_id: body.target_user_id,
			role: body.role || 'member',
			can_manage: body.can_manage !== undefined ? body.can_manage : 0,
		});

		return createResponse({
			message: '添加成员成功',
			data: { user_id: body.target_user_id },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 移除用户组成员
groupRouter.post(`${groupBasePath}/members/remove`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as { group_id: string; target_user_id: string };

		if (!body.group_id || !body.target_user_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少必要参数',
			});
		}

		const memberModel = createModel<UserGroupMember>(env.food_turns_luck_d1 as unknown as D1Database, 'user_group_members');

		// 检查操作者是否有管理权限
		const operatorMember = await memberModel.findOne({
			group_id: body.group_id,
			user_id: userId,
		});

		if (!operatorMember || operatorMember.can_manage !== 1) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权限管理该用户组',
			});
		}

		// 检查目标成员
		const targetMember = await memberModel.findOne({
			group_id: body.group_id,
			user_id: body.target_user_id,
		});

		if (!targetMember) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '该用户不在组中',
			});
		}

		// 不能移除owner
		if (targetMember.role === 'owner') {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '不能移除创建者',
			});
		}

		// 移除成员
		const result = await memberModel.delete({
			group_id: body.group_id,
			user_id: body.target_user_id,
		});

		if (result.changes === 0) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '移除失败',
			});
		}

		return createResponse({
			message: '移除成员成功',
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 更新成员权限
groupRouter.post(`${groupBasePath}/members/update`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as {
			group_id: string;
			target_user_id: string;
		} & UserGroupMemberEditableFields;

		if (!body.group_id || !body.target_user_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少必要参数',
			});
		}

		const memberModel = createModel<UserGroupMember>(env.food_turns_luck_d1 as unknown as D1Database, 'user_group_members');

		// 检查操作者是否有管理权限
		const operatorMember = await memberModel.findOne({
			group_id: body.group_id,
			user_id: userId,
		});

		if (!operatorMember || operatorMember.can_manage !== 1) {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '无权限管理该用户组',
			});
		}

		// 检查目标成员
		const targetMember = await memberModel.findOne({
			group_id: body.group_id,
			user_id: body.target_user_id,
		});

		if (!targetMember) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '该用户不在组中',
			});
		}

		// 不能修改owner的权限
		if (targetMember.role === 'owner') {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '不能修改创建者的权限',
			});
		}

		// 只提取允许编辑的字段
		const editableData: UserGroupMemberEditableFields = {};

		if (body.role !== undefined) {
			editableData.role = body.role;
		}
		if (body.can_manage !== undefined) {
			editableData.can_manage = body.can_manage;
		}

		// 检查是否有可更新的字段
		const hasEditableFields = body.role !== undefined || body.can_manage !== undefined;
		if (!hasEditableFields) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '没有可更新的字段',
			});
		}

		// 更新成员权限
		const result = await memberModel.update(
			{
				group_id: body.group_id,
				user_id: body.target_user_id,
			},
			editableData,
		);

		if (result.changes === 0) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '更新失败',
			});
		}

		return createResponse({
			message: '成员权限更新成功',
			data: { updated: result.changes },
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});

// 退出用户组
groupRouter.post(`${groupBasePath}/leave`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const userId = (request as any).user?.id;

		if (!userId) {
			return createResponse({
				code: RESPONSE_CODE.UNAUTHORIZED,
				message: '未登录',
			});
		}

		// 解析请求体
		const body = (await request.json()) as { group_id: string };

		if (!body.group_id) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少组ID',
			});
		}

		const memberModel = createModel<UserGroupMember>(env.food_turns_luck_d1 as unknown as D1Database, 'user_group_members');

		// 检查用户是否在组中
		const member = await memberModel.findOne({
			group_id: body.group_id,
			user_id: userId,
		});

		if (!member) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '你不在该用户组中',
			});
		}

		// owner不能退出，只能删除组
		if (member.role === 'owner') {
			return createResponse({
				code: RESPONSE_CODE.FORBIDDEN,
				message: '创建者不能退出，请删除用户组',
			});
		}

		// 退出用户组
		const result = await memberModel.delete({
			group_id: body.group_id,
			user_id: userId,
		});

		if (result.changes === 0) {
			return createResponse({
				code: RESPONSE_CODE.NOT_FOUND,
				message: '退出失败',
			});
		}

		return createResponse({
			message: '退出用户组成功',
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});
