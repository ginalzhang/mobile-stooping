import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

export const q = (text, params) => pool.query(text, params);

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
