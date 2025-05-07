import db from '../../config/db.js';

class Bookmark {
  // Create a new bookmark
  static create(userId, url, title, favicon, summary) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO bookmarks (user_id, url, title, favicon, summary) VALUES (?, ?, ?, ?, ?)',
        [userId, url, title, favicon, summary],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, userId, url, title, favicon, summary });
          }
        }
      );
    });
  }

  // Get all bookmarks for a user
  static getAllByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, bookmarks) => {
          if (err) {
            reject(err);
          } else {
            resolve(bookmarks);
          }
        }
      );
    });
  }

  // Get a specific bookmark
  static getById(id, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM bookmarks WHERE id = ? AND user_id = ?',
        [id, userId],
        (err, bookmark) => {
          if (err) {
            reject(err);
          } else {
            resolve(bookmark);
          }
        }
      );
    });
  }

  // Delete a bookmark
  static delete(id, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM bookmarks WHERE id = ? AND user_id = ?',
        [id, userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ deleted: this.changes > 0 });
          }
        }
      );
    });
  }
}

export default Bookmark;
