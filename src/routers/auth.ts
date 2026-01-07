import { Router } from 'itty-router';
import { createResponse } from '../utils/index';
import { signToken } from '../utils/jwt';
import { RESPONSE_CODE } from '../constants/index';
import { createModel } from '../utils/db';
import type { User } from '../types/user';

// 创建登录路由器
export const authRouter = Router();
// 基础路由
export const authBasePath = '/auth' as const;

// 微信小程序登录
authRouter.post(`${authBasePath}/login`, async (request: Request, env: Env): Promise<Response> => {
	try {
		const body = (await request.json()) as { code: string };

		// 验证必填参数
		if (!body.code) {
			return createResponse({
				code: RESPONSE_CODE.BAD_REQUEST,
				message: '缺少微信登录凭证',
			});
		}

		// 从环境变量获取微信配置
		const appid = env.WECHAT_APPID;
		const secret = env.WECHAT_SECRET;

		if (!appid || !secret) {
			return createResponse({
				code: RESPONSE_CODE.ERROR,
				message: '服务器配置错误',
			});
		}

		// 调用微信接口换取 openid 和 session_key
		const wxApiUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${body.code}&grant_type=authorization_code`;

		const wxResponse = await fetch(wxApiUrl);
		const wxData = (await wxResponse.json()) as {
			openid?: string;
			session_key?: string;
			unionid?: string;
			errcode?: number;
			errmsg?: string;
		};

		// 检查微信接口返回的错误
		if (wxData.errcode) {
			return createResponse({
				code: RESPONSE_CODE.ERROR,
				message: `微信登录失败: ${wxData.errmsg}`,
			});
		}

		if (!wxData.openid) {
			return createResponse({
				code: RESPONSE_CODE.ERROR,
				message: '获取用户信息失败',
			});
		}

		// 查询或创建用户
		const userModel = createModel<User>(env.food_turns_luck_d1 as unknown as D1Database, 'users');

		// 检查用户是否存在
		let user = await userModel.findOne({ id: wxData.openid });

		if (!user) {
			// 新用户，创建记录
			await userModel.create({
				id: wxData.openid,
				nickname: null,
				avatar_key: null,
			});

			user = await userModel.findOne({ id: wxData.openid });
		}

		// 使用 JWT 生成 token
		const token = await signToken(wxData.openid, '7d');

		return createResponse({
			message: '登录成功',
			data: {
				token,
				user: {
					id: user?.id,
					nickname: user?.nickname,
					avatar_key: user?.avatar_key,
				},
			},
		});
	} catch (error) {
		return createResponse({
			code: RESPONSE_CODE.ERROR,
			message: error instanceof Error ? error.message : '未知错误',
		});
	}
});
