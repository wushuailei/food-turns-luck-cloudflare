/**
 * Cloudflare D1 简单 CRUD 封装
 * 无需手写 SQL，直接调用方法即可
 */

export interface QueryOptions {
	where?: Record<string, unknown>;
	orderBy?: string;
	limit?: number;
	offset?: number;
}

export interface PaginationOptions {
	page?: number;
	pageSize?: number;
}

/**
 * D1 CRUD 封装类
 */
export class D1Model<T = Record<string, unknown>> {
	private db: D1Database;
	private table: string;

	constructor(db: D1Database, table: string) {
		this.db = db;
		this.table = table;
	}

	/**
	 * 查询所有记录
	 */
	async findAll(options?: QueryOptions): Promise<T[]> {
		let query = `SELECT * FROM ${this.table}`;
		const params: unknown[] = [];

		// 构建 WHERE 条件
		if (options?.where) {
			const conditions = Object.keys(options.where).map((key) => `${key} = ?`);
			query += ` WHERE ${conditions.join(' AND ')}`;
			params.push(...Object.values(options.where));
		}

		// 排序
		if (options?.orderBy) {
			query += ` ORDER BY ${options.orderBy}`;
		}

		// 分页
		if (options?.limit) {
			query += ` LIMIT ?`;
			params.push(options.limit);
		}
		if (options?.offset) {
			query += ` OFFSET ?`;
			params.push(options.offset);
		}

		const stmt = this.db.prepare(query).bind(...params);
		const result = await stmt.all<T>();
		return result.results || [];
	}

	/**
	 * 分页查询
	 */
	async findPage(options?: QueryOptions & PaginationOptions): Promise<{
		list: T[];
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	}> {
		const page = options?.page || 1;
		const pageSize = options?.pageSize || 10;
		const offset = (page - 1) * pageSize;

		// 查询数据
		const list = await this.findAll({
			...options,
			limit: pageSize,
			offset,
		});

		// 查询总数
		const total = await this.count(options?.where);

		return {
			list,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	}

	/**
	 * 查询单条记录
	 */
	async findOne(where: Record<string, unknown>): Promise<T | null> {
		const conditions = Object.keys(where).map((key) => `${key} = ?`);
		const query = `SELECT * FROM ${this.table} WHERE ${conditions.join(' AND ')} LIMIT 1`;
		const params = Object.values(where);

		const stmt = this.db.prepare(query).bind(...params);
		const result = await stmt.first<T>();
		return result || null;
	}

	/**
	 * 根据 ID 查询
	 */
	async findById(id: number | string): Promise<T | null> {
		return this.findOne({ id });
	}

	/**
	 * 插入记录
	 */
	async create(data: Partial<T>): Promise<{ id: number; success: boolean }> {
		const keys = Object.keys(data);
		const columns = keys.join(', ');
		const placeholders = keys.map(() => '?').join(', ');
		const params = Object.values(data);

		const query = `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders})`;
		const stmt = this.db.prepare(query).bind(...params);
		const result = await stmt.run();

		return {
			id: result.meta.last_row_id || 0,
			success: result.success,
		};
	}

	/**
	 * 批量插入
	 */
	async createMany(dataList: Partial<T>[]): Promise<{ success: boolean; count: number }> {
		if (dataList.length === 0) {
			return { success: true, count: 0 };
		}

		const statements = dataList.map((data) => {
			const keys = Object.keys(data);
			const columns = keys.join(', ');
			const placeholders = keys.map(() => '?').join(', ');
			const params = Object.values(data);
			const query = `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders})`;
			return this.db.prepare(query).bind(...params);
		});

		const results = await this.db.batch(statements);
		return {
			success: results.every((r) => r.success),
			count: dataList.length,
		};
	}

	/**
	 * 更新记录
	 */
	async update(where: Record<string, unknown>, data: Partial<T>): Promise<{ success: boolean; changes: number }> {
		const dataKeys = Object.keys(data);
		const setParts = dataKeys.map((key) => `${key} = ?`);
		const setParams = Object.values(data);

		const whereKeys = Object.keys(where);
		const whereParts = whereKeys.map((key) => `${key} = ?`);
		const whereParams = Object.values(where);

		const query = `UPDATE ${this.table} SET ${setParts.join(', ')} WHERE ${whereParts.join(' AND ')}`;
		const params = [...setParams, ...whereParams];

		const stmt = this.db.prepare(query).bind(...params);
		const result = await stmt.run();

		return {
			success: result.success,
			changes: result.meta.changes || 0,
		};
	}

	/**
	 * 根据 ID 更新
	 */
	async updateById(id: number | string, data: Partial<T>): Promise<{ success: boolean; changes: number }> {
		return this.update({ id }, data);
	}

	/**
	 * 删除记录
	 */
	async delete(where: Record<string, unknown>): Promise<{ success: boolean; changes: number }> {
		const whereKeys = Object.keys(where);
		const whereParts = whereKeys.map((key) => `${key} = ?`);
		const whereParams = Object.values(where);

		const query = `DELETE FROM ${this.table} WHERE ${whereParts.join(' AND ')}`;
		const stmt = this.db.prepare(query).bind(...whereParams);
		const result = await stmt.run();

		return {
			success: result.success,
			changes: result.meta.changes || 0,
		};
	}

	/**
	 * 根据 ID 删除
	 */
	async deleteById(id: number | string): Promise<{ success: boolean; changes: number }> {
		return this.delete({ id });
	}

	/**
	 * 统计记录数
	 */
	async count(where?: Record<string, unknown>): Promise<number> {
		let query = `SELECT COUNT(*) as count FROM ${this.table}`;
		const params: unknown[] = [];

		if (where) {
			const conditions = Object.keys(where).map((key) => `${key} = ?`);
			query += ` WHERE ${conditions.join(' AND ')}`;
			params.push(...Object.values(where));
		}

		const stmt = this.db.prepare(query).bind(...params);
		const result = await stmt.first<{ count: number }>();
		return result?.count || 0;
	}

	/**
	 * 检查记录是否存在
	 */
	async exists(where: Record<string, unknown>): Promise<boolean> {
		const count = await this.count(where);
		return count > 0;
	}
}

/**
 * 创建 D1Model 实例
 */
export function createModel<T = Record<string, unknown>>(db: D1Database, table: string): D1Model<T> {
	return new D1Model<T>(db, table);
}
