// Simple test to check specific API response

async function testSingleAPI() {
  try {
    console.log('Testing pricing API...')
    const response = await fetch('http://localhost:3001/api/pricing?product_ids=test-1,test-2')
    const text = await response.text()
    
    console.log('Status:', response.status)
    console.log('Response text (first 500 chars):')
    console.log(text.substring(0, 500))
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const data = JSON.parse(text)
        console.log('Parsed JSON:', JSON.stringify(data, null, 2))
      } catch (e) {
        console.log('Failed to parse as JSON')
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testSingleAPI()