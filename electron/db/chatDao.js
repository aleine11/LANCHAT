// ===== 聊天记录 + 联系人 DAO =====
// DAO = Data Access Object（数据访问对象）
// 简单理解：专门负责和 chat_history / contacts 两张表打交道的"办事员"
//
// 为什么要把数据库操作抽出来单独一个文件？
//   1. 单一职责：业务逻辑不用管 SQL 怎么写，只关心"给我查数据"
//   2. 方便测试：可以单独测试 DAO 层，不改业务代码
//   3. 方便替换：以后如果换数据库（MySQL→SQLite），只改这一层

const { getDatabase } = require('./database')

// ==================== 聊天记录 ====================

/**
 * 插入一条聊天消息
 *
 * @param {Object} msg - 消息对象
 * @param {string} msg.deviceIp       - 对方 IP
 * @param {string} msg.deviceName     - 对方名称
 * @param {string} msg.content        - 消息内容（文字 or 图片路径）
 * @param {string} msg.contentType    - 'text' 或 'image'
 * @param {number} msg.isSelf         - 0=收到, 1=发出
 * @param {string} [msg.thumbnailPath] - 缩略图路径（仅图片）
 * @param {string} [msg.imagePath]    - 原图路径（仅图片）
 * @param {number} [msg.imageSize]    - 图片大小（字节）
 * @param {number} [msg.imageWidth]   - 图片宽度
 * @param {number} [msg.imageHeight]  - 图片高度
 * @param {string} msg.messageId      - 全局唯一消息ID
 * @param {string} [msg.createdAt]    - 创建时间（ISO格式，默认当前时间）
 * @returns {number} 新消息的自增ID
 */
function insertMessage(msg) {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO chat_history
      (device_ip, device_name, content, content_type, is_self,
       thumbnail_path, image_path, image_size, image_width, image_height,
       is_read, message_id, created_at)
    VALUES
      (@deviceIp, @deviceName, @content, @contentType, @isSelf,
       @thumbnailPath, @imagePath, @imageSize, @imageWidth, @imageHeight,
       @isRead, @messageId, @createdAt)
  `)

  const result = stmt.run({
    deviceIp: msg.deviceIp,
    deviceName: msg.deviceName,
    content: msg.content,
    contentType: msg.contentType || 'text',
    isSelf: msg.isSelf ?? 0,
    thumbnailPath: msg.thumbnailPath || null,
    imagePath: msg.imagePath || null,
    imageSize: msg.imageSize || null,
    imageWidth: msg.imageWidth || null,
    imageHeight: msg.imageHeight || null,
    isRead: msg.isSelf ? 1 : 0,  // 自己发的消息默认已读，收到的默认未读
    messageId: msg.messageId,
    createdAt: msg.createdAt || new Date().toISOString()
  })

  return result.lastInsertRowid
}

/**
 * 分页查询与某设备的聊天记录
 *
 * @param {string} deviceIp  - 对方IP
 * @param {number} page      - 页码（从1开始）
 * @param {number} pageSize  - 每页数量
 * @returns {{ list: Array, total: number, hasMore: boolean }}
 */
function getChatHistory(deviceIp, page = 1, pageSize = 20) {
  const db = getDatabase()
  const offset = (page - 1) * pageSize

  // 查总数
  const countStmt = db.prepare(
    'SELECT COUNT(*) as total FROM chat_history WHERE device_ip = ?'
  )
  const { total } = countStmt.get(deviceIp)

  // 查记录（按时间倒序，最新的在最后）
  const listStmt = db.prepare(`
    SELECT id, device_ip, device_name, content, content_type, is_self,
           thumbnail_path, image_path, image_size, image_width, image_height,
           is_read, message_id, created_at
    FROM chat_history
    WHERE device_ip = ?
    ORDER BY created_at ASC
    LIMIT ? OFFSET ?
  `)

  const list = listStmt.all(deviceIp, pageSize, offset)

  return {
    list,
    total,
    hasMore: offset + pageSize < total
  }
}

/**
 * 将某个设备的未读消息标记为已读
 */
function markAsRead(deviceIp) {
  const db = getDatabase()
  const stmt = db.prepare(`
    UPDATE chat_history SET is_read = 1
    WHERE device_ip = ? AND is_read = 0 AND is_self = 0
  `)
  const result = stmt.run(deviceIp)
  return result.changes  // 返回实际更新的行数
}

/**
 * 获取与某设备的未读消息数
 */
function getUnreadCount(deviceIp) {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM chat_history
    WHERE device_ip = ? AND is_read = 0 AND is_self = 0
  `)
  const row = stmt.get(deviceIp)
  return row.count
}

// ==================== 联系人管理 ====================

/**
 * 更新或插入联系人信息
 * 每次收发消息后调用，更新最后消息和未读数
 */
function upsertContact(contactData) {
  const db = getDatabase()
  const now = new Date().toISOString()
  const { deviceIp, deviceName, hostname, lastMessage } = contactData

  const existing = db.prepare('SELECT * FROM contacts WHERE device_ip = ?').get(deviceIp)

  if (existing) {
    // 更新已有联系人
    // 收到消息才累加未读数，自己发的消息不增加未读
    const unreadIncrement = contactData.isFromOther ? 1 : 0
    db.prepare(`
      UPDATE contacts SET
        device_name = COALESCE(?, device_name),
        hostname = COALESCE(?, hostname),
        last_message = ?,
        last_message_time = ?,
        unread_count = unread_count + ?,
        updated_at = ?
      WHERE device_ip = ?
    `).run(
      deviceName || existing.device_name,
      hostname || existing.hostname,
      lastMessage || existing.last_message,
      now,
      unreadIncrement,
      now,
      deviceIp
    )
  } else {
    // 新增联系人
    db.prepare(`
      INSERT INTO contacts
        (device_ip, device_name, hostname, last_message, last_message_time,
         unread_count, first_contact_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(deviceIp, deviceName, hostname || null, lastMessage || null, now, 0, now, now)
  }
}

/**
 * 获取最近联系人列表（按最后消息时间倒序）
 */
function getRecentContacts() {
  const db = getDatabase()
  return db.prepare(`
    SELECT device_ip, device_name, hostname, last_message, last_message_time,
           unread_count, first_contact_at, updated_at
    FROM contacts
    WHERE is_blocked = 0
    ORDER BY updated_at DESC
  `).all()
}

/**
 * 清除某联系人的未读计数
 */
function clearUnread(deviceIp) {
  const db = getDatabase()
  db.prepare('UPDATE contacts SET unread_count = 0 WHERE device_ip = ?').run(deviceIp)
}

module.exports = {
  insertMessage,
  getChatHistory,
  markAsRead,
  getUnreadCount,
  upsertContact,
  getRecentContacts,
  clearUnread
}
