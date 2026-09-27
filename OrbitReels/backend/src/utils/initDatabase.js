import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initDatabase(pg) {
  const sql = await fs.readFile(path.join(__dirname, '../models/init.sql'), 'utf8');
  try {
    await pg.query(sql);
    console.log('DB ready');
  } catch (e) {
    console.log('DB init:', e.message);
  }
}