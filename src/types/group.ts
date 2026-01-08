// 用户组类型
export interface UserGroup {
	id: string; // 组唯一标识符
	name?: string; // 组名称（可选）
	avatar_key?: string; // 组头像 R2 key
	group_type: 'family' | 'partner'; // 组类型
	created_at?: string;
	updated_at?: string;
}

// 用户组成员类型
export interface UserGroupMember {
	group_id: string; // 组ID
	user_id: string; // 用户ID
	role: 'owner' | 'member'; // 角色
	can_manage: number; // 是否可管理该用户组: 1=可管理, 0=不可管理
	joined_at?: string;
}

// 用户组可编辑字段
export interface UserGroupEditableFields {
	name?: string;
	avatar_key?: string;
	group_type?: 'family' | 'partner';
	updated_at?: string;
}

// 用户组成员可编辑字段
export interface UserGroupMemberEditableFields {
	role?: 'owner' | 'member';
	can_manage?: number;
}
