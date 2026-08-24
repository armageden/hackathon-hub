import { pool } from "../../db/pool.js";
import { ConflictError, NotFoundError } from "../../middleware/error.middleware.js";
import type {
  HardwareItem,
  HardwareCheckout,
  HardwareReturn,
  HardwareDamageReport,
  HardwareAnalytics,
  HardwareTimelineEvent,
  CreateHardwareItemRequest,
  UpdateHardwareItemRequest,
  CheckoutHardwareRequest,
  ReturnHardwareRequest,
  CreateDamageReportRequest,
} from "../../types/index.js";

export const hardwareRepository = {
  // Hardware Items
  async listByEvent(eventId: string, params?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: HardwareItem[]; total: number }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 25;
    const offset = (page - 1) * pageSize;
    const sortBy = params?.sortBy || 'created_at';
    const sortOrder = params?.sortOrder || 'desc';

    let whereClause = 'WHERE event_id = $1';
    const queryParams: unknown[] = [eventId];
    let paramIndex = 2;

    if (params?.status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }
    if (params?.category) {
      whereClause += ` AND category = $${paramIndex}`;
      queryParams.push(params.category);
      paramIndex++;
    }
    if (params?.search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR model ILIKE $${paramIndex} OR serial_number ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    // Validate sortBy to prevent SQL injection
    const allowedSortColumns = ['name', 'category', 'model', 'quantity_available', 'status', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM hardware_items ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT id, event_id, name, category, model, serial_number, quantity_available, condition, status, location, notes, created_at, updated_at
       FROM hardware_items
       ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, pageSize, offset]
    );

    return { items: dataResult.rows, total };
  },

  async getById(eventId: string, itemId: string): Promise<HardwareItem | null> {
    const result = await pool.query(
      `SELECT id, event_id, name, category, model, serial_number, quantity_available, condition, status, location, notes, created_at, updated_at
       FROM hardware_items
       WHERE id = $1 AND event_id = $2`,
      [itemId, eventId]
    );
    return result.rows[0] || null;
  },

  async create(eventId: string, data: CreateHardwareItemRequest, createdBy: string): Promise<HardwareItem> {
    const result = await pool.query(
      `INSERT INTO hardware_items (event_id, name, category, model, serial_number, quantity_available, condition, location, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, event_id, name, category, model, serial_number, quantity_available, condition, status, location, notes, created_at, updated_at`,
      [
        eventId,
        data.name,
        data.category || null,
        data.model || null,
        data.serial_number || null,
        data.quantity_available || 1,
        data.condition || 'good',
        data.location || null,
        data.notes || null,
      ]
    );
    return result.rows[0];
  },

  // All-or-nothing: one transaction, any failure rolls back the whole batch
  async createMany(eventId: string, items: CreateHardwareItemRequest[], createdBy: string): Promise<HardwareItem[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const created: HardwareItem[] = [];
      for (const data of items) {
        const result = await client.query(
          `INSERT INTO hardware_items (event_id, name, category, model, serial_number, quantity_available, condition, location, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, event_id, name, category, model, serial_number, quantity_available, condition, status, location, notes, created_at, updated_at`,
          [
            eventId,
            data.name,
            data.category || null,
            data.model || null,
            data.serial_number || null,
            data.quantity_available || 1,
            data.condition || 'good',
            data.location || null,
            data.notes || null,
          ]
        );
        created.push(result.rows[0]);
      }
      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async update(eventId: string, itemId: string, data: UpdateHardwareItemRequest): Promise<HardwareItem | null> {
    const fields: string[] = [];
    const values: unknown[] = [itemId, eventId];
    let paramIndex = 3;

    const allowedFields = ['name', 'category', 'model', 'serial_number', 'quantity_available', 'condition', 'status', 'location', 'notes'];
    for (const field of allowedFields) {
      if (data[field as keyof UpdateHardwareItemRequest] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field as keyof UpdateHardwareItemRequest]);
        paramIndex++;
      }
    }

    if (fields.length === 0) return this.getById(eventId, itemId);

    fields.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE hardware_items SET ${fields.join(', ')} WHERE id = $1 AND event_id = $2 RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(eventId: string, itemId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM hardware_items WHERE id = $1 AND event_id = $2`,
      [itemId, eventId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },

  // Checkouts
  async listCheckouts(eventId: string): Promise<HardwareCheckout[]> {
    const result = await pool.query(
      `SELECT hc.*, hi.name as hardware_item_name, hi.category as hardware_item_category,
              u.full_name as borrower_name, u.email as borrower_email,
              co_by.full_name as checked_out_by_name
       FROM hardware_checkouts hc
       JOIN hardware_items hi ON hc.hardware_item_id = hi.id
       JOIN users u ON hc.borrower_user_id = u.id
       JOIN users co_by ON hc.checked_out_by = co_by.id
       WHERE hc.event_id = $1
       ORDER BY hc.checked_out_at DESC`,
      [eventId]
    );
    return result.rows;
  },

  async getCheckoutById(eventId: string, checkoutId: string): Promise<HardwareCheckout | null> {
    const result = await pool.query(
      `SELECT hc.*, hi.name as hardware_item_name, hi.category as hardware_item_category,
              u.full_name as borrower_name, u.email as borrower_email,
              co_by.full_name as checked_out_by_name
       FROM hardware_checkouts hc
       JOIN hardware_items hi ON hc.hardware_item_id = hi.id
       JOIN users u ON hc.borrower_user_id = u.id
       JOIN users co_by ON hc.checked_out_by = co_by.id
       WHERE hc.id = $1 AND hc.event_id = $2`,
      [checkoutId, eventId]
    );
    return result.rows[0] || null;
  },

  async getActiveCheckoutForItem(hardwareItemId: string): Promise<HardwareCheckout | null> {
    const result = await pool.query(
      `SELECT * FROM hardware_checkouts
       WHERE hardware_item_id = $1 AND status IN ('active', 'overdue')
       ORDER BY checked_out_at DESC LIMIT 1`,
      [hardwareItemId]
    );
    return result.rows[0] || null;
  },

  async getUserActiveCheckouts(eventId: string, userId: string): Promise<HardwareCheckout[]> {
    const result = await pool.query(
      `SELECT hc.*, hi.name as hardware_item_name
       FROM hardware_checkouts hc
       JOIN hardware_items hi ON hc.hardware_item_id = hi.id
       WHERE hc.event_id = $1 AND hc.borrower_user_id = $2 AND hc.status IN ('active', 'overdue')
       ORDER BY hc.checked_out_at DESC`,
      [eventId, userId]
    );
    return result.rows;
  },

  async checkout(eventId: string, data: CheckoutHardwareRequest, checkedOutBy: string): Promise<HardwareCheckout> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check availability and lock the item row.
      // status must be re-checked here: the service-level check happened
      // outside this transaction, so it can be stale by the time we lock.
      const itemResult = await client.query(
        `SELECT quantity_available FROM hardware_items
         WHERE id = $1 AND event_id = $2 AND status = 'available'
         FOR UPDATE`,
        [data.hardware_item_id, eventId]
      );

      if (itemResult.rows.length === 0) {
        throw new ConflictError('Item is not available for checkout');
      }

      const available = itemResult.rows[0].quantity_available;
      if (available <= 0) {
        throw new ConflictError('No quantity available');
      }

      // Create checkout record
      const checkoutResult = await client.query(
        `INSERT INTO hardware_checkouts (event_id, hardware_item_id, borrower_user_id, checked_out_by, due_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [eventId, data.hardware_item_id, data.borrower_user_id, checkedOutBy, data.due_at || null, data.notes || null]
      );

      // Decrease available quantity; flip status only when pool is exhausted
      await client.query(
        `UPDATE hardware_items SET quantity_available = quantity_available - 1,
         status = CASE WHEN quantity_available - 1 <= 0 THEN 'checked_out' ELSE status END,
         updated_at = NOW()
         WHERE id = $1`,
        [data.hardware_item_id]
      );

      await client.query('COMMIT');
      return checkoutResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Returns
  async returnHardware(
    eventId: string,
    data: ReturnHardwareRequest,
    damage?: { description: string; severity: string }
  ): Promise<{ checkout: HardwareCheckout; returnRecord: HardwareReturn }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get checkout and verify
      const checkoutResult = await client.query(
        `SELECT * FROM hardware_checkouts WHERE id = $1 AND event_id = $2 FOR UPDATE`,
        [data.checkout_id, eventId]
      );

      if (checkoutResult.rows.length === 0) {
        throw new NotFoundError('Checkout not found');
      }

      const checkout = checkoutResult.rows[0];
      if (checkout.status === 'returned') {
        throw new ConflictError('Item already returned');
      }
      if (checkout.status === 'damaged') {
        throw new ConflictError('Item marked as damaged, cannot return normally');
      }

      // Create return record
      const returnResult = await client.query(
        `INSERT INTO hardware_returns (checkout_id, returned_at, condition, received_by, notes)
         VALUES ($1, NOW(), $2, $3, $4)
         RETURNING *`,
        [data.checkout_id, data.condition, data.received_by, data.notes || null]
      );

      // Update checkout status
      await client.query(
        `UPDATE hardware_checkouts SET status = 'returned', notes = COALESCE(notes, '') || ' Returned: ' || COALESCE($1, '') WHERE id = $2`,
        [data.notes || null, data.checkout_id]
      );

      if (damage) {
        // Damaged return: report and item state must land in this same
        // transaction, otherwise a failure halfway leaves an inconsistent item
        await client.query(
          `INSERT INTO hardware_damage_reports (event_id, hardware_item_id, checkout_id, reported_by, description, severity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [eventId, checkout.hardware_item_id, data.checkout_id, data.received_by, damage.description, damage.severity]
        );
        await client.query(
          `UPDATE hardware_items SET quantity_available = quantity_available + 1,
           condition = 'damaged', status = 'damaged', updated_at = NOW()
           WHERE id = $1`,
          [checkout.hardware_item_id]
        );
      } else {
        // Increase available quantity
        await client.query(
          `UPDATE hardware_items SET quantity_available = quantity_available + 1,
           condition = $1,
           status = CASE WHEN quantity_available + 1 > 0 THEN 'available' ELSE status END,
           updated_at = NOW()
           WHERE id = $2`,
          [data.condition, checkout.hardware_item_id]
        );
      }

      await client.query('COMMIT');
      return { checkout: checkoutResult.rows[0], returnRecord: returnResult.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Damage Reports
  async listDamageReports(eventId: string): Promise<HardwareDamageReport[]> {
    const result = await pool.query(
      `SELECT hdr.*, hi.name as hardware_item_name, u.full_name as reported_by_name
       FROM hardware_damage_reports hdr
       JOIN hardware_items hi ON hdr.hardware_item_id = hi.id
       JOIN users u ON hdr.reported_by = u.id
       WHERE hdr.event_id = $1
       ORDER BY hdr.created_at DESC`,
      [eventId]
    );
    return result.rows;
  },

  async createDamageReport(eventId: string, data: CreateDamageReportRequest, reportedBy: string): Promise<HardwareDamageReport> {
    const result = await pool.query(
      `INSERT INTO hardware_damage_reports (event_id, hardware_item_id, checkout_id, reported_by, description, severity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [eventId, data.hardware_item_id, data.checkout_id || null, reportedBy, data.description, data.severity]
    );

    // Update item status to damaged
    await pool.query(
      `UPDATE hardware_items SET status = 'damaged', condition = 'damaged', updated_at = NOW() WHERE id = $1`,
      [data.hardware_item_id]
    );

    // If there's an active checkout, update its status
    if (data.checkout_id) {
      await pool.query(
        `UPDATE hardware_checkouts SET status = 'damaged' WHERE id = $1`,
        [data.checkout_id]
      );
    }

    return result.rows[0];
  },

  async resolveDamageReport(eventId: string, reportId: string, resolvedBy: string): Promise<HardwareDamageReport | null> {
    const result = await pool.query(
      `UPDATE hardware_damage_reports SET status = 'resolved', resolved_at = NOW() WHERE id = $1 AND event_id = $2 RETURNING *`,
      [reportId, eventId]
    );
    return result.rows[0] || null;
  },

  // Analytics
  async getAnalytics(eventId: string): Promise<HardwareAnalytics> {
    const [itemsStats, checkoutsOverTime, topBorrowed, activeCheckouts] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) as total_items,
           SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_items,
           SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as checked_out_items,
           SUM(CASE WHEN status = 'damaged' THEN 1 ELSE 0 END) as damaged_items,
           SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_items,
           (SELECT COUNT(*) FROM hardware_checkouts
            WHERE event_id = $1 AND status IN ('active', 'overdue')
              AND due_at IS NOT NULL AND due_at < NOW()) as overdue_items
         FROM hardware_items WHERE event_id = $1`,
        [eventId]
      ),
      pool.query(
        `SELECT DATE(checked_out_at) as date, COUNT(*) as count
         FROM hardware_checkouts
         WHERE event_id = $1 AND checked_out_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(checked_out_at)
         ORDER BY date`,
        [eventId]
      ),
      pool.query(
        `SELECT hi.id, hi.event_id, hi.name, hi.category, hi.model, hi.serial_number, hi.quantity_available, hi.condition, hi.status, hi.location, hi.notes, hi.created_at, hi.updated_at, COUNT(hc.id) as checkout_count
         FROM hardware_items hi
         LEFT JOIN hardware_checkouts hc ON hi.id = hc.hardware_item_id
         WHERE hi.event_id = $1
         GROUP BY hi.id, hi.event_id
         ORDER BY checkout_count DESC
         LIMIT 10`,
        [eventId]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM hardware_checkouts
         WHERE event_id = $1 AND status IN ('active', 'overdue')`,
        [eventId]
      ),
    ]);

    const itemsByCategoryResult = await pool.query(
      `SELECT category, COUNT(*) as count FROM hardware_items WHERE event_id = $1 AND category IS NOT NULL GROUP BY category`,
      [eventId]
    );

    const itemsByStatusResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM hardware_items WHERE event_id = $1 GROUP BY status`,
      [eventId]
    );

    return {
      totalItems: parseInt(itemsStats.rows[0].total_items, 10),
      availableItems: parseInt(itemsStats.rows[0].available_items, 10),
      checkedOutItems: parseInt(itemsStats.rows[0].checked_out_items, 10),
      damagedItems: parseInt(itemsStats.rows[0].damaged_items, 10),
      overdueItems: parseInt(itemsStats.rows[0].overdue_items, 10),
      activeCheckouts: parseInt(activeCheckouts.rows[0].count, 10),
      itemsByCategory: Object.fromEntries(itemsByCategoryResult.rows.map(r => [r.category, parseInt(r.count, 10)])),
      itemsByStatus: Object.fromEntries(itemsByStatusResult.rows.map(r => [r.status, parseInt(r.count, 10)])),
      checkoutsOverTime: checkoutsOverTime.rows.map(r => ({ date: r.date, count: parseInt(r.count, 10) })),
      topBorrowedItems: topBorrowed.rows.map(r => ({
        item: {
          id: r.id,
          event_id: r.event_id,
          name: r.name,
          category: r.category,
          model: r.model,
          serial_number: r.serial_number,
          quantity_available: r.quantity_available,
          condition: r.condition,
          status: r.status,
          location: r.location,
          notes: r.notes,
          created_at: r.created_at,
          updated_at: r.updated_at,
        },
        checkoutCount: parseInt(r.checkout_count, 10),
      })),
    };
  },

  // Overdue check
  async getOverdueCheckouts(eventId: string): Promise<HardwareCheckout[]> {
    const result = await pool.query(
      `SELECT hc.*, hi.name as hardware_item_name, u.full_name as borrower_name, u.email as borrower_email
       FROM hardware_checkouts hc
       JOIN hardware_items hi ON hc.hardware_item_id = hi.id
       JOIN users u ON hc.borrower_user_id = u.id
       WHERE hc.event_id = $1 AND hc.status = 'active' AND hc.due_at < NOW()
       ORDER BY hc.due_at ASC`,
      [eventId]
    );
    return result.rows;
  },

  async markOverdue(eventId: string): Promise<number> {
    const result = await pool.query(
      `UPDATE hardware_checkouts SET status = 'overdue'
       WHERE event_id = $1 AND status = 'active' AND due_at IS NOT NULL AND due_at < NOW()`,
      [eventId]
    );
    return result.rowCount ?? 0;
  },

  async isEventMember(eventId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT EXISTS(
         SELECT 1 FROM event_members
         WHERE event_id = $1 AND user_id = $2 AND status = 'active'
       ) AS member`,
      [eventId, userId]
    );
    return result.rows[0]?.member === true;
  },

  // Item timeline (created, checkouts, returns, damage reports)
  async getItemTimeline(eventId: string, itemId: string): Promise<HardwareTimelineEvent[]> {
    const result = await pool.query(
      `SELECT type, timestamp, user_name, details FROM (
         SELECT 'created' AS type, hi.created_at AS timestamp, NULL::text AS user_name,
                json_build_object('name', hi.name, 'condition', hi.condition) AS details
         FROM hardware_items hi
         WHERE hi.id = $1 AND hi.event_id = $2
         UNION ALL
         SELECT 'checked_out', hc.checked_out_at, u.full_name,
                json_build_object('checkout_id', hc.id, 'borrower_user_id', hc.borrower_user_id,
                                  'borrower_name', u.full_name,
                                  'due_at', hc.due_at, 'notes', hc.notes)
         FROM hardware_checkouts hc
         JOIN users u ON hc.borrower_user_id = u.id
         WHERE hc.hardware_item_id = $1 AND hc.event_id = $2
         UNION ALL
         SELECT 'returned', hr.returned_at, u.full_name,
                json_build_object('checkout_id', hr.checkout_id, 'condition', hr.condition,
                                  'notes', hr.notes)
         FROM hardware_returns hr
         JOIN hardware_checkouts hc ON hr.checkout_id = hc.id
         JOIN users u ON hr.received_by = u.id
         WHERE hc.hardware_item_id = $1 AND hc.event_id = $2
         UNION ALL
         SELECT 'damaged', hdr.created_at, u.full_name,
                json_build_object('damage_report_id', hdr.id, 'severity', hdr.severity,
                                  'description', hdr.description, 'status', hdr.status)
         FROM hardware_damage_reports hdr
         JOIN users u ON hdr.reported_by = u.id
         WHERE hdr.hardware_item_id = $1 AND hdr.event_id = $2
       ) events
       ORDER BY timestamp ASC`,
      [itemId, eventId]
    );
    return result.rows.map((row) => ({
      type: row.type,
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : String(row.timestamp),
      user_name: row.user_name,
      details: row.details,
    }));
  },
};