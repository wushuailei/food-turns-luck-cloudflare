export const RESPONSE_CODE = {
	SUCCESS: 200,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	ERROR: 500,
} as const;
export type RESPONSE_CODE_TYPE = (typeof RESPONSE_CODE)[keyof typeof RESPONSE_CODE];

export const RESPONSE_MESSAGE = {
	[RESPONSE_CODE.SUCCESS]: '成功',
	[RESPONSE_CODE.BAD_REQUEST]: '请求参数错误',
	[RESPONSE_CODE.UNAUTHORIZED]: '未授权',
	[RESPONSE_CODE.FORBIDDEN]: '无权限',
	[RESPONSE_CODE.NOT_FOUND]: '未找到',
	[RESPONSE_CODE.ERROR]: '服务器错误',
} as const;

export const ROUTER_WHITE_LIST: string[] = ['/auth/login'] as const;
