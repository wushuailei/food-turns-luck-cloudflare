/**
 * 用户收藏相关类型定义
 */

// 用户收藏表完整类型
export interface UserFavorite {
	user_id: string;
	recipe_id: string;
	created_at: string;
}

// 收藏记录（包含菜谱详情）
export interface FavoriteWithRecipe extends UserFavorite {
	recipe_name: string;
	recipe_description: string | null;
	recipe_cover_image_key: string | null;
	recipe_user_id: string;
	recipe_is_public: number;
}
