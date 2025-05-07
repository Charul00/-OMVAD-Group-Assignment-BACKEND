import db from '../../config/db.js';
import bcrypt from 'bcrypt';

class User {
  // Register a new user
  static async create(email, password) {
    try {
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (email, password) VALUES (?, ?)',
          [email, hashedPassword],
          function(err) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed')) {
                reject(new Error('Email already in use'));
              } else {
                reject(err);
              }
            } else {
              resolve({ id: this.lastID, email });
            }
          }
        );
      });
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      });
    });
  }

  // Find user by id
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, email, created_at FROM users WHERE id = ?', [id], (err, user) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      });
    });
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

export default User;
