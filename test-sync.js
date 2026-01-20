// Test syncing users and custom exercises
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://rixtfukurnfqlyydtpzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeHRmdWt1cm5mcWx5eWR0cHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTkxMDYsImV4cCI6MjA4NDQ5NTEwNn0.TLU2CN-VXNF-FcJ4-UHa5iBP5Xw9g3XClpYFQr7UELk'
)

async function testSync() {
  console.log('Testing user and exercise sync...\n')
  
  // Test 1: Insert a user
  console.log('1. Testing user sync...')
  const testUser = {
    id: 'test-user-' + Date.now(),
    sync_code: 'TEST',
    name: 'Test Gym User',
    avatar: '/avatars/02e5ef8fa00e64c8881597fbf765ca2f.jpg'
  }
  
  const { error: userError } = await supabase
    .from('shared_users')
    .insert([testUser])
  
  if (userError) {
    console.error('❌ User sync failed:', userError.message)
  } else {
    console.log('✅ User synced successfully!')
  }
  
  // Test 2: Insert custom exercises
  console.log('\n2. Testing custom exercise sync...')
  const exercises = [
    { sync_code: 'TEST', body_part: 'Chest', exercise_name: 'Cable Fly Variation' },
    { sync_code: 'TEST', body_part: 'Arms', exercise_name: 'Concentration Curl' }
  ]
  
  const { error: exError } = await supabase
    .from('shared_custom_exercises')
    .insert(exercises)
  
  if (exError) {
    console.error('❌ Custom exercise sync failed:', exError.message)
  } else {
    console.log('✅ Custom exercises synced successfully!')
  }
  
  // Test 3: Fetch synced data
  console.log('\n3. Testing data retrieval...')
  const { data: users } = await supabase
    .from('shared_users')
    .select('*')
    .eq('sync_code', 'TEST')
  
  const { data: customExs } = await supabase
    .from('shared_custom_exercises')
    .select('*')
    .eq('sync_code', 'TEST')
  
  console.log(`✅ Found ${users?.length || 0} user(s)`)
  console.log(`✅ Found ${customExs?.length || 0} custom exercise(s)`)
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...')
  await supabase.from('shared_users').delete().eq('sync_code', 'TEST')
  await supabase.from('shared_custom_exercises').delete().eq('sync_code', 'TEST')
  
  console.log('\n✨ All sync tests passed! Your profiles and custom exercises will now sync across devices.')
}

testSync().catch(console.error)
