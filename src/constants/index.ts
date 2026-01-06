export const ROUTER_WHITE_LIST: string[] = ['/login'] as const;

export const RESPONSE_CODE = {
	SUCCESS: 200,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	NOT_FOUND: 404,
	ERROR: 500,
} as const;
export type RESPONSE_CODE_TYPE = (typeof RESPONSE_CODE)[keyof typeof RESPONSE_CODE];

export const RESPONSE_MESSAGE = {
	[RESPONSE_CODE.SUCCESS]: 'Success',
	[RESPONSE_CODE.BAD_REQUEST]: 'Bad Request',
	[RESPONSE_CODE.UNAUTHORIZED]: 'Unauthorized',
	[RESPONSE_CODE.NOT_FOUND]: 'Not Found',
	[RESPONSE_CODE.ERROR]: 'Error',
} as const;
