import { type RESPONSE_CODE_TYPE, RESPONSE_CODE, RESPONSE_MESSAGE } from '../constants/index';

export interface ResponseParams<T> {
	code: RESPONSE_CODE_TYPE;
	data?: T;
	message?: string;
}

export function createResponse<T>(responseParams: ResponseParams<T>, options?: ResponseInit): Response {
	return new Response(
		JSON.stringify({
			message: RESPONSE_MESSAGE[responseParams.code],
			...responseParams,
		}),
		{
			status: options?.status || responseParams.code,
			headers: {
				'Content-Type': 'application/json',
				...(options?.headers || {}),
			},
			...(options || {}),
		}
	);
}
