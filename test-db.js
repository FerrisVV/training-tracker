// Quick test to verify Supabase schema
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://rixtfukurnfqlyydtpzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpeHRmdWt1cm5mcWx5eWR0cHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTkxMDYsImV4cCI6MjA4NDQ5NTEwNn0.TLU2CN-VXNF-FcJ4-UHa5iBP5Xw9g3XClpYFQr7UELk'
)

async function testSchema() {
  console.log('Testing Supabase shared_sessions table schema...\n')
  
  // Generate a proper UUID
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Try to insert a test record
  const testSession = {
    id: generateUUID(),
    sync_code: 'TEST',
    created_by: 'test-user-id',
    creator_name: 'Test User',
    creator_avatar: '/avatars/02e5ef8fa00e64c8881597fbf765ca2f.jpg',
    date: '2026-01-20',
    type: 'Chest',
    participants: [
      {
        user_id: 'test-user-id',
        user_name: 'Test User',
        user_avatar: '/avatars/02e5ef8fa00e64c8881597fbf765ca2f.jpg',
        exercises: [
          {
            exercise_name: 'Bench Press',
            sets: [
              { set_number: 1, weight: 135, reps: 10 },
              { set_number: 2, weight: 155, reps: 8 }
            ]
          }
        ],
        notes: 'Test session'
      }
    ],
    created_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('shared_sessions')
    .insert([testSession])
    .select()

  if (error) {
    console.error('❌ ERROR:', error.message)
    console.error('Details:', error.details)
    console.error('Hint:', error.hint)
    console.log('\n⚠️  Schema update needed! Run the SQL in Supabase SQL Editor.')
  } else {
    console.log('✅ SUCCESS! Table schema is correct.')
    console.log('Test record created:', data)
    
    // Clean up - delete test record
    await supabase.from('shared_sessions').delete().eq('sync_code', 'TEST')
    console.log('\n🧹 Test record cleaned up.')
  }
}

testSchema().catch(console.error)
