/**
 * 用户相关类型定义
 */

// 用户完整类型
export interface User {
	id: string;
	nickname: string | null;
	avatar_key: string | null;
	created_at: string;
	updated_at: string;
}

// 用户可编辑字段
export interface UserEditableFields {
	nickname?: string;
	avatar_key?: string;
	updated_at?: string;
}
