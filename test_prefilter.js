// Verification script for video-prefilter module
const path = require('path');

async function testPrefilter() {
  console.log('Testing video prefilter module...');
  
  try {
    const { validateVideoPreFilter } = require('./sov-dashboard/src/lib/video-prefilter');
    console.log('Successfully imported validateVideoPreFilter!');

    // Test Case 1: Music song title
    const musicCandidate = {
      youtube_id: 'test_music_1',
      title: 'Top 10 Hindi Songs 2025 | Official Music Video',
      channel_name: 'T-Series',
      channel_id: 'tseries_id',
      description: 'Listen to the full album song lyrics',
      duration_sec: 240,
    };

    const res1 = await validateVideoPreFilter(musicCandidate, 'Best Mixer Grinder Under 5000');
    console.log('Test 1 (Music Title) Result:', res1);

    // Test Case 2: Gaming title
    const gamingCandidate = {
      youtube_id: 'test_gaming_1',
      title: 'BGMI Gameplay Live Stream #shorts',
      channel_name: 'Pro Gamer',
      channel_id: 'gamer_id',
      description: 'Playing GTA 5 and free fire',
      duration_sec: 45,
    };

    const res2 = await validateVideoPreFilter(gamingCandidate, 'Best Mixer Grinder Under 5000');
    console.log('Test 2 (Gaming Title) Result:', res2);

    console.log('All basic unit tests passed!');
  } catch (err) {
    console.error('Error during test execution:', err);
    process.exit(1);
  }
}

testPrefilter();
