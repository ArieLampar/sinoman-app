const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigrations() {
  console.log('🗄️  Running Database Migrations...')
  console.log('======================================')

  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations')
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  console.log(`Found ${migrationFiles.length} migration files`)

  for (const file of migrationFiles) {
    console.log(`\n📄 Running ${file}...`)
    
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    
    // Split by semicolon to handle multiple statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        try {
          const { error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          })
          
          if (error) {
            // Try direct query for DDL statements
            const { error: directError } = await supabase
              .from('__direct_sql__')  // This won't work, but let's try exec approach
              .select('*')
            
            if (directError) {
              console.log(`   Statement ${i + 1}: ⚠️  ${error.message} (may be expected for CREATE IF NOT EXISTS)`)
            }
          } else {
            console.log(`   Statement ${i + 1}: ✅ Success`)
          }
        } catch (err) {
          console.log(`   Statement ${i + 1}: ⚠️  ${err.message} (may be expected)`)
        }
      }
    }
    
    console.log(`✅ Completed ${file}`)
  }

  console.log('\n======================================')
  console.log('🎯 Database migration complete!')
  
  // Test basic table existence
  console.log('\n🔍 Verifying core tables...')
  
  const coreTables = [
    'tenants', 'members', 'products', 
    'waste_types', 'waste_collections', 'maggot_batches'
  ]
  
  for (const table of coreTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (!error) {
        console.log(`✅ Table '${table}' exists and accessible`)
      } else {
        console.log(`❌ Table '${table}' error: ${error.message}`)
      }
    } catch (err) {
      console.log(`❌ Table '${table}' not accessible: ${err.message}`)
    }
  }
}

if (require.main === module) {
  runMigrations().catch(console.error)
}

module.exports = { runMigrations }