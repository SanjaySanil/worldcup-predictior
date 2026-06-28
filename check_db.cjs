const dotenv = require('dotenv');
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function checkSwagger() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
  const data = await res.json();
  
  console.log('match_results columns:', Object.keys(data.definitions.match_results.properties).join(', '));
  console.log('predictions columns:', Object.keys(data.definitions.predictions.properties).join(', '));
  console.log('leaderboard columns:', Object.keys(data.definitions.leaderboard.properties).join(', '));
}

checkSwagger().catch(console.error);
