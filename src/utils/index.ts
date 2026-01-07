import { type RESPONSE_CODE_TYPE, RESPONSE_MESSAGE, RESPONSE_CODE } from '../constants/index';

export interface ResponseParams<T> {
	code?: RESPONSE_CODE_TYPE;
	data?: T;
	message?: string;
}

export function createResponse<T>(responseParams: ResponseParams<T>, options?: ResponseInit): Response {
	const code = responseParams.code || RESPONSE_CODE.SUCCESS;
	return new Response(
		JSON.stringify({
			message: RESPONSE_MESSAGE[code],
			...responseParams,
		}),
		{
			status: options?.status || code,
			headers: {
				'Content-Type': 'application/json',
				...(options?.headers || {}),
			},
			...(options || {}),
		},
	);
}
