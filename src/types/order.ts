/**
 * 订单相关类型定义
 */

// 订单完整类型
export interface Order {
	id: string; // 主键（UUID）
	user_id: string;
	order_no: string; // 订单号（用于显示）
	target_time: string | null;
	status: 'pending' | 'completed' | 'timeout';
	remark: string | null;
	created_at: string;
}

// 订单创建字段
export interface OrderCreateFields {
	id: string;
	user_id: string;
	order_no: string;
	target_time?: string;
	remark?: string;
}

// 订单可编辑字段（仅状态）
export interface OrderEditableFields {
	status: 'pending' | 'completed' | 'timeout';
}
