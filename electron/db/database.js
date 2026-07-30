// ===== 数据库连接管理 =====
// 负责：初始化 SQLite、创建表结构、提供数据库连接
// 
// better-sqlite3 是一个同步的 SQLite 驱动
// 为什么选同步而不是异步？
//   1. SQLite 是本地文件数据库，读写速度极快（微秒级）
//   2. 同步代码写起来简单，不需要回调/Promise
//   3. Electron 主进程里本身就运行在独立线程，不阻塞 UI

const Database = require('better-sqlite3')
const { app } = require('electron')
const path = require('path')
const fs = require('fs')

// 数据库文件存放路径
// app.getPath('userData') 在 Windows 上是 C:\Users\用户名\AppData\Roaming\LanChat\
const DB_DIR = path.join(app.getPath('userData'), 'LanChat')
const DB_PATH = path.join(DB_DIR, 'lanchat.db')

let db = null

/**
 * 获取数据库连接（单例模式）
 * 整个应用只有一个数据库连接，避免文件锁冲突
 */
function getDatabase() {
  if (db) return db

  // 确保目录存在
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  // 创建连接
  db = new Database(DB_PATH)

  // 开启 WAL 模式（Write-Ahead Logging）
  // 好处：读和写互不阻塞，多个地方同时读数据不会等写入完成
  db.pragma('journal_mode = WAL')

  // 开启外键约束（虽然目前表关系简单，但留着防止以后需要）
  db.pragma('foreign_keys = ON')

  console.log(`[数据库] 已连接: ${DB_PATH}`)
  return db
}

/**
 * 初始化所有数据表
 * 用 IF NOT EXISTS 保证重复调用不会报错
 */
function initTables() {
  const database = getDatabase()

  // ===== 表1：聊天记录表 =====
  database.exec(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      device_ip       TEXT    NOT NULL,
      device_name     TEXT    NOT NULL,
      content         TEXT    NOT NULL,
      content_type    TEXT    NOT NULL DEFAULT 'text',
      is_self         INTEGER NOT NULL DEFAULT 0,
      thumbnail_path  TEXT    NULL,
      image_path      TEXT    NULL,
      image_size      INTEGER NULL,
      image_width     INTEGER NULL,
      image_height    INTEGER NULL,
      is_read         INTEGER NOT NULL DEFAULT 0,
      message_id      TEXT    NOT NULL,
      status          TEXT    NOT NULL DEFAULT 'sent',  -- [Bugfix] sent=已发送, pending=发送中, failed=发送失败, received=已收到
      created_at      TEXT    NOT NULL
    );

    -- 按设备查聊天记录
    CREATE INDEX IF NOT EXISTS idx_chat_device_ip
      ON chat_history(device_ip);

    -- 按时间排序消息
    CREATE INDEX IF NOT EXISTS idx_chat_created_at
      ON chat_history(created_at);

    -- 联合索引：查某个设备的历史并按时间排序（最常用）
    CREATE INDEX IF NOT EXISTS idx_chat_device_time
      ON chat_history(device_ip, created_at);

    -- 唯一索引：防止网络重传导致同一条消息存两遍
    CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_message_id
      ON chat_history(message_id);

    -- [Bugfix] 给已存在的旧表补充 status 字段（迁移用）
    -- 旧表没有 status 列时 ADD COLUMN
  `)

  // 兼容旧数据库：检查 status 字段是否存在
  const columns = database.prepare("PRAGMA table_info(chat_history)").all()
  if (!columns.find(c => c.name === 'status')) {
    console.log('[数据库] 迁移：添加 status 字段到 chat_history')
    database.exec("ALTER TABLE chat_history ADD COLUMN status TEXT NOT NULL DEFAULT 'sent'")
  }
  `)

  // ===== 表2：配置表 =====
  database.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `)

  // ===== 表3：联系人表 =====
  database.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      device_ip         TEXT PRIMARY KEY,
      device_name       TEXT NOT NULL,
      hostname          TEXT NULL,
      last_message      TEXT NULL,
      last_message_time TEXT NULL,
      unread_count      INTEGER NOT NULL DEFAULT 0,
      is_blocked        INTEGER NOT NULL DEFAULT 0,
      first_contact_at  TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    );

    -- 按最近聊天时间排序
    CREATE INDEX IF NOT EXISTS idx_contacts_time
      ON contacts(last_message_time DESC);
  `)

  console.log('[数据库] 表结构初始化完成')
}

/**
 * 关闭数据库连接
 * 应用退出时调用，释放文件锁
 */
function closeDatabase() {
  if (db) {
    db.close()
    db = null
    console.log('[数据库] 连接已关闭')
  }
}

module.exports = { getDatabase, initTables, closeDatabase, DB_PATH }
