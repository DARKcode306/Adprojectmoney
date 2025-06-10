
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function migrateDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migration...');
    
    // Add missing columns to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
      ADD COLUMN IF NOT EXISTS referred_by_id INTEGER,
      ADD COLUMN IF NOT EXISTS investment_usd_balance INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS investment_egp_balance INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ad_limit_reset_time TIMESTAMP
    `);
    
    // Add missing columns to investment_packages table
    await client.query(`
      ALTER TABLE investment_packages 
      ADD COLUMN IF NOT EXISTS ad_reward_percentage INTEGER DEFAULT 10,
      ADD COLUMN IF NOT EXISTS ads_watched_today INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_ad_watch TIMESTAMP
    `);
    
    // Add missing columns to user_investments table  
    await client.query(`
      ALTER TABLE user_investments 
      ADD COLUMN IF NOT EXISTS ads_watched_today INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_ad_watch TIMESTAMP
    `);
    
    // Add ad reward percentage column to investment packages
    await client.query(`
      ALTER TABLE investment_packages 
      ADD COLUMN IF NOT EXISTS ad_reward_percentage INTEGER DEFAULT 10
    `);
    
    console.log('✅ Users table columns added successfully');
    
    // Create ad_tasks table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_tasks (
        id SERIAL PRIMARY KEY,
        points_per_view INTEGER NOT NULL DEFAULT 500,
        daily_limit INTEGER NOT NULL DEFAULT 50,
        cooldown_seconds INTEGER NOT NULL DEFAULT 15,
        cooldown_minutes DECIMAL NOT NULL DEFAULT 0.25,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log('✅ ad_tasks table created successfully');
    
    // Insert default ad task settings if none exist
    await client.query(`
      INSERT INTO ad_tasks (points_per_view, daily_limit, cooldown_seconds, cooldown_minutes, is_active)
      SELECT 500, 50, 15, 0.25, true
      WHERE NOT EXISTS (SELECT 1 FROM ad_tasks WHERE is_active = true)
    `);
    
    console.log('✅ Default ad task settings added');
    
    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateDatabase().catch(console.error);
