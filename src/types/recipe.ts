/**
 * 菜谱相关类型定义
 */

// 菜谱完整类型
export interface Recipe {
	id: string;
	user_id: string;
	name: string;
	description: string | null;
	cover_image_key: string | null;
	step_type: 'custom' | 'link';
	steps: string | null; // JSON 数组字符串
	links: string | null; // JSON 数组字符串
	is_public: number; // 0=私密, 1=公开
	view_count: number;
	like_count: number;
	created_at: string;
	updated_at: string;
}

// 菜谱创建字段
export interface RecipeCreateFields {
	id: string;
	user_id: string;
	name: string;
	description?: string;
	cover_image_key?: string;
	step_type: 'custom' | 'link';
	steps?: string; // JSON 数组字符串
	links?: string; // JSON 数组字符串
	is_public?: number;
}

// 菜谱可编辑字段
export interface RecipeEditableFields {
	name?: string;
	description?: string;
	cover_image_key?: string;
	step_type?: 'custom' | 'link';
	steps?: string;
	links?: string;
	is_public?: number;
	updated_at?: string;
}
