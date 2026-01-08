// 订单评价类型
export interface OrderReview {
	id: string; // 评价唯一标识符
	order_id: string; // 订单ID
	user_id: string; // 评价者用户ID
	rating?: number; // 评分（1-5星，可选）
	content?: string; // 评价内容（文字）
	images?: string; // 评价图片，JSON 数组存储 R2 keys
	created_at?: string;
	updated_at?: string;
}

// 订单评价可编辑字段
export interface OrderReviewEditableFields {
	rating?: number;
	content?: string;
	images?: string;
	updated_at?: string;
}

// 订单评价创建字段
export interface OrderReviewCreateFields {
	id: string;
	order_id: string;
	user_id: string;
	rating?: number;
	content?: string;
	images?: string;
}
