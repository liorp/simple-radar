import { readFileSync, statSync, watch } from 'fs';
import { join } from 'path';
import type { CSVRow, RadarTarget, PlaybackInfo } from '../../types.ts';
import { IS_DEV_MODE } from '../config.ts';

// CSV data state
let csvData: CSVRow[] = [];
let currentTimestampIndex: number = 0;
let timestamps: number[] = [];
let isPlaying: boolean = false;
let playbackInterval: Timer | null = null;

// Prod mode state
let lastReadPosition: number = 0;
let csvPath: string = '';
let fileWatcher: any = null;
let csvHeaders: string[] = [];
let readDebounceTimer: Timer | null = null;
let consecutiveErrors: number = 0;
const MAX_CONSECUTIVE_ERRORS = 3;

// Validate CSV row has required fields
function isValidCSVRow(row: CSVRow): boolean {
  return (
    row.track_id !== undefined &&
    typeof row.timestamp === 'number' &&
    !isNaN(row.timestamp) &&
    typeof row.x === 'number' &&
    !isNaN(row.x) &&
    typeof row.y === 'number' &&
    !isNaN(row.y)
  );
}

// Parse CSV rows from lines
function parseCSVRows(lines: string[], headers: string[]): CSVRow[] {
  const validRows: CSVRow[] = [];

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    const values = line.split(',');
    const row: CSVRow = {} as CSVRow;

    headers.forEach((header, index) => {
      const value = values[index];
      if (value !== undefined) {
        // Try to parse as number, otherwise keep as string
        row[header] = isNaN(value as any) || value === '' ? value : parseFloat(value);
      }
    });

    // Only include valid rows
    if (isValidCSVRow(row)) {
      validRows.push(row);
    } else {
      console.warn('⚠️  Skipping invalid CSV row:', line.substring(0, 100));
    }
  }

  return validRows;
}

// Initialize CSV handler
export function loadCSV(customPath?: string): boolean {
  try {
    csvPath = customPath || join(process.cwd(), 'trks.csv');

    const csvContent = readFileSync(csvPath, 'utf-8');
    const trimmedContent = csvContent.trim();

    // Handle empty file
    if (!trimmedContent) {
      console.error('❌ CSV file is empty');
      return false;
    }

    const lines = trimmedContent.split('\n');

    // Parse header
    csvHeaders = lines[0]?.split(',') || [];
    if (csvHeaders.length === 0) {
      throw new Error('CSV file has no header row');
    }

    if (IS_DEV_MODE()) {
      // DEV MODE: Load all data and loop through it
      csvData = parseCSVRows(lines.slice(1), csvHeaders);

      // Extract unique timestamps and sort them
      const uniqueTimestamps = new Set(csvData.map(row => row.timestamp));
      timestamps = Array.from(uniqueTimestamps).sort((a, b) => a - b);

      console.log(`✅ [DEV MODE] Loaded ${csvData.length} tracks with ${timestamps.length} unique timestamps`);

      // Auto-start playback loop
      startPlayback();
    } else {
      // PROD MODE: Track file position and watch for new data
      const fileStats = statSync(csvPath);
      lastReadPosition = fileStats.size;

      console.log(`✅ [PROD MODE] Initialized CSV handler, monitoring for new data`);

      // Start watching the file for changes
      startFileWatching();
    }

    return true;
  } catch (error) {
    console.error('❌ Error loading CSV:', error);
    return false;
  }
}

// Get targets for current timestamp
export function getCurrentTargets(): RadarTarget[] {
  if (IS_DEV_MODE()) {
    // DEV MODE: Return targets at current timestamp index
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
  } else {
    // PROD MODE: Return all current data (newly ingested targets)
    const targets = csvData.map(row => ({
      track_id: row.track_id,
      timestamp: row.timestamp,
      x: row.x,
      y: row.y,
      velocity: Math.abs(row.doppler),
      doppler: row.doppler,
      range: row.range,
      class: row.class
    }));

    return targets;
  }
}

// Start automatic playback through timestamps (DEV MODE ONLY)
function startPlayback(): void {
  if (!IS_DEV_MODE() || isPlaying) return;

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

// Start file watching (PROD MODE ONLY)
function startFileWatching(): void {
  if (IS_DEV_MODE()) return;

  console.log('👁️  Watching trks.csv for new data...');

  // Watch for file changes
  fileWatcher = watch(csvPath, (eventType: string, filename: string | null) => {
    if (eventType === 'change') {
      // Debounce rapid file changes
      if (readDebounceTimer) {
        clearTimeout(readDebounceTimer);
      }

      readDebounceTimer = setTimeout(() => {
        readNewData();
      }, 100); // Wait 100ms after last change
    }
  });

  // Handle watcher errors
  fileWatcher.on?.('error', (error: Error) => {
    console.error('❌ File watcher error:', error);
    // Try to restart watcher
    setTimeout(() => {
      if (fileWatcher) {
        fileWatcher.close();
      }
      startFileWatching();
    }, 1000);
  });
}

// Reload entire CSV file (fallback for errors)
function reloadEntireFile(): boolean {
  try {
    console.log('🔄 Reloading entire CSV file...');

    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');

    // Skip header line
    const dataLines = lines.slice(1);
    const newRows = parseCSVRows(dataLines, csvHeaders);

    // In prod mode, only keep the latest batch
    csvData = newRows;

    // Update file position to current size
    const fileStats = statSync(csvPath);
    lastReadPosition = fileStats.size;

    consecutiveErrors = 0; // Reset error counter
    console.log(`✅ Full reload complete: ${newRows.length} tracks`);

    return true;
  } catch (error) {
    console.error('❌ Critical error reloading file:', error);
    return false;
  }
}

// Read new data from CSV file (PROD MODE ONLY)
function readNewData(): void {
  try {
    const fileStats = statSync(csvPath);
    const currentSize = fileStats.size;

    // Handle file truncation or shrinkage - reload entire file
    if (currentSize < lastReadPosition) {
      console.warn('⚠️  File size decreased - reloading entire file');
      if (reloadEntireFile()) {
        return;
      } else {
        consecutiveErrors++;
        return;
      }
    }

    // No new data
    if (currentSize === lastReadPosition) {
      return;
    }

    // File has grown - read new data
    if (currentSize > lastReadPosition) {
      const csvContent = readFileSync(csvPath, 'utf-8');
      const allLines = csvContent.split('\n');

      // Find where we left off by counting bytes
      let bytesRead = 0;
      let startLine = 0;

      for (let i = 0; i < allLines.length; i++) {
        const lineLength = Buffer.byteLength(allLines[i] + '\n', 'utf-8');
        if (bytesRead >= lastReadPosition) {
          startLine = i;
          break;
        }
        bytesRead += lineLength;
      }

      // Extract only new lines
      const newLines = allLines.slice(startLine).filter(line => line.trim().length > 0);

      if (newLines.length > 0) {
        const newRows = parseCSVRows(newLines, csvHeaders);

        // Validate we got some valid data
        if (newRows.length === 0) {
          console.warn('⚠️  No valid rows found in new data - may be corrupted');
          consecutiveErrors++;

          // If too many errors, reload entire file
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.error(`❌ ${MAX_CONSECUTIVE_ERRORS} consecutive errors - reloading entire file`);
            reloadEntireFile();
          }
          return;
        }

        // Replace csvData with only the new entries
        csvData = newRows;

        consecutiveErrors = 0; // Reset error counter
        console.log(`📊 Ingested ${newRows.length} new tracks`);
      }

      // Update last read position
      lastReadPosition = currentSize;
    }
  } catch (error) {
    console.error('❌ Error reading new data:', error);
    consecutiveErrors++;

    // If too many consecutive errors, try reloading entire file
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(`❌ ${MAX_CONSECUTIVE_ERRORS} consecutive errors - attempting full reload`);
      reloadEntireFile();
    }
  }
}

// Stop playback and cleanup
export function stopPlayback(): void {
  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
  if (readDebounceTimer) {
    clearTimeout(readDebounceTimer);
    readDebounceTimer = null;
  }
  isPlaying = false;
  console.log('⏸️  Stopped CSV playback');
}

// Get playback info
export function getPlaybackInfo(): PlaybackInfo {
  if (IS_DEV_MODE()) {
    return {
      currentTimestamp: timestamps[currentTimestampIndex] ?? 0,
      totalTimestamps: timestamps.length,
      currentIndex: currentTimestampIndex,
      isPlaying
    };
  } else {
    // In prod mode, return info about the latest ingested data
    const latestTimestamp = csvData.length > 0
      ? Math.max(...csvData.map(row => row.timestamp))
      : 0;

    return {
      currentTimestamp: latestTimestamp,
      totalTimestamps: csvData.length,
      currentIndex: 0,
      isPlaying: false // Not looping in prod mode
    };
  }
}

// Test helpers - exported for testing only
export function __test_reset(): void {
  csvData = [];
  currentTimestampIndex = 0;
  timestamps = [];
  isPlaying = false;
  lastReadPosition = 0;
  csvPath = '';
  csvHeaders = [];
  consecutiveErrors = 0;

  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
  if (readDebounceTimer) {
    clearTimeout(readDebounceTimer);
    readDebounceTimer = null;
  }
}

export function __test_getState() {
  return {
    csvData,
    currentTimestampIndex,
    timestamps,
    isPlaying,
    lastReadPosition,
    csvPath,
    csvHeaders,
    consecutiveErrors
  };
}
