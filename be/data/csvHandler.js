import { readFileSync } from 'fs';
import { join } from 'path';

// CSV data state
let csvData = [];
let currentTimestampIndex = 0;
let timestamps = [];
let isPlaying = false;
let playbackInterval = null;

// Parse CSV file
export function loadCSV() {
  try {
    const csvPath = join(process.cwd(), 'trks.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');

    // Parse header
    const headers = lines[0].split(',');

    // Parse data rows
    csvData = lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, index) => {
        const value = values[index];
        // Try to parse as number, otherwise keep as string
        row[header] = isNaN(value) || value === '' ? value : parseFloat(value);
      });
      return row;
    });

    // Extract unique timestamps and sort them
    const uniqueTimestamps = new Set(csvData.map(row => row.timestamp));
    timestamps = Array.from(uniqueTimestamps).sort((a, b) => a - b);

    console.log(`✅ Loaded ${csvData.length} tracks with ${timestamps.length} unique timestamps`);

    // Auto-start playback
    startPlayback();

    return true;
  } catch (error) {
    console.error('❌ Error loading CSV:', error);
    return false;
  }
}

// Get targets for current timestamp
export function getCurrentTargets() {
  if (timestamps.length === 0) {
    return [];
  }

  const currentTimestamp = timestamps[currentTimestampIndex];

  // Get all tracks at current timestamp
  const targets = csvData
    .filter(row => row.timestamp === currentTimestamp)
    .map(row => ({
      track_id: row.track_id,
      timestamp: row.timestamp,
      x: row.x,
      y: row.y,
      velocity: Math.abs(row.doppler), // Use doppler as velocity
      doppler: row.doppler,
      range: row.range,
      class: row.class
    }));

  return targets;
}

// Start automatic playback through timestamps
function startPlayback() {
  if (isPlaying) return;

  isPlaying = true;
  console.log('▶️  Starting CSV playback');

  // Advance timestamp every 500ms
  playbackInterval = setInterval(() => {
    currentTimestampIndex = (currentTimestampIndex + 1) % timestamps.length;

    // Log when we loop back
    if (currentTimestampIndex === 0) {
      console.log('🔄 Playback loop - restarting from beginning');
    }
  }, 500);
}

// Stop playback
export function stopPlayback() {
  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
  isPlaying = false;
  console.log('⏸️  Stopped CSV playback');
}

// Get playback info
export function getPlaybackInfo() {
  return {
    currentTimestamp: timestamps[currentTimestampIndex],
    totalTimestamps: timestamps.length,
    currentIndex: currentTimestampIndex,
    isPlaying
  };
}
