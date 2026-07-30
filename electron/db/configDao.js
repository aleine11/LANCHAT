// ===== 系统配置 DAO =====
// 负责 config 表（键值对配置）的读写
// 存储用户设置：显示名称、主题色、端口号等

const { getDatabase } = require('./database')

/**
 * 读取一个配置项
 *
 * @param {string} key - 配置键名（如 'user_name'）
 * @param {string} [defaultValue=''] - 不存在时的默认值
 * @returns {string} 配置值
 */
function getConfig(key, defaultValue = '') {
  const db = getDatabase()
  const stmt = db.prepare('SELECT value FROM config WHERE key = ?')
  const row = stmt.get(key)
  return row ? row.value : defaultValue
}

/**
 * 设置一个配置项
 *
 * @param {string} key   - 配置键名
 * @param {string} value - 配置值
 */
function setConfig(key, value) {
  const db = getDatabase()
  const now = new Date().toISOString()

  // INSERT OR REPLACE：如果 key 已存在就更新，不存在就插入
  // 这是 SQLite 特有的语法，省去了"先查后决定"的步骤
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO config (key, value, updated_at)
    VALUES (?, ?, ?)
  `)
  stmt.run(key, String(value), now)
}

/**
 * 读取所有配置项（返回键值对对象）
 * @returns {Object} 例如 { user_name: '小明', theme_color: '#409EFF' }
 */
function getAllConfig() {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM config').all()
  const config = {}
  for (const row of rows) {
    config[row.key] = row.value
  }
  return config
}

module.exports = { getConfig, setConfig, getAllConfig }
