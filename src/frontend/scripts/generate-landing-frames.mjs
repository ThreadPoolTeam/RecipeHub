#!/usr/bin/env node

/**
 * Pipeline trích xuất frame Full HD (1920x1080) và metadata manifest cho RecipeHub Cinematic Landing.
 * Usage:
 *   node src/frontend/scripts/generate-landing-frames.mjs --source docs/videos/tvc-phe-la.mp4 --output src/frontend/public/landing/phe-la
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    source: 'docs/videos/tvc-phe-la.mp4',
    output: 'src/frontend/public/landing/phe-la',
    start: 0.0,
    end: 13.5,
    desktopFps: 24,
    mobileFps: 16,
    desktopQuality: 78,
    mobileQuality: 72,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--source' && args[i + 1]) options.source = args[++i];
    else if (arg === '--output' && args[i + 1]) options.output = args[++i];
    else if (arg === '--start' && args[i + 1]) options.start = parseFloat(args[++i]);
    else if (arg === '--end' && args[i + 1]) options.end = parseFloat(args[++i]);
    else if (arg === '--desktop-fps' && args[i + 1]) options.desktopFps = parseInt(args[++i], 10);
    else if (arg === '--mobile-fps' && args[i + 1]) options.mobileFps = parseInt(args[++i], 10);
    else if (arg === '--desktop-quality' && args[i + 1]) options.desktopQuality = parseInt(args[++i], 10);
    else if (arg === '--mobile-quality' && args[i + 1]) options.mobileQuality = parseInt(args[++i], 10);
  }

  return options;
}

function checkDependencies() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    execSync('ffprobe -version', { stdio: 'ignore' });
  } catch {
    console.error('Error: ffmpeg hoặc ffprobe không tìm thấy trong PATH.');
    process.exit(1);
  }
}

function probeVideo(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: Không tìm thấy video nguồn tại: ${sourcePath}`);
    process.exit(1);
  }

  try {
    const raw = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -show_entries format=duration -of json "${sourcePath}"`,
      { encoding: 'utf-8' }
    );
    const data = JSON.parse(raw);
    const stream = data.streams && data.streams[0];
    const duration = parseFloat(data.format?.duration || stream?.duration || '0');
    return {
      width: stream?.width || 1920,
      height: stream?.height || 1080,
      duration,
      fps: stream?.r_frame_rate || '50/1',
    };
  } catch (err) {
    console.error('Error probing video:', err.message);
    process.exit(1);
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function cleanManagedDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (file.endsWith('.webp')) {
        fs.unlinkSync(path.join(dirPath, file));
      }
    }
  } else {
    ensureDir(dirPath);
  }
}

function extractProfileFrames(source, profileDir, start, end, fps, quality) {
  cleanManagedDir(profileDir);
  const duration = end - start;
  const outPattern = path.join(profileDir, 'frame-%04d.webp').replace(/\\/g, '/');
  const cmd = `ffmpeg -y -ss ${start} -t ${duration} -i "${source}" -vf "fps=${fps}" -c:v libwebp -quality ${quality} -compression_level 4 "${outPattern}"`;
  console.log(`Extracting ${fps}fps (q=${quality}) to ${profileDir}...`);
  execSync(cmd, { stdio: 'inherit' });

  const generated = fs.readdirSync(profileDir).filter((f) => f.endsWith('.webp')).sort();
  let totalBytes = 0;
  for (const f of generated) {
    totalBytes += fs.statSync(path.join(profileDir, f)).size;
  }

  return {
    count: generated.length,
    pattern: 'frame-%04d.webp',
    fps,
    quality,
    totalBytes,
    totalBytesFormatted: `${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
  };
}

function extractSingle(source, time, outFile, quality = 80) {
  ensureDir(path.dirname(outFile));
  const cmd = `ffmpeg -y -ss ${time} -i "${source}" -vframes 1 -c:v libwebp -quality ${quality} "${outFile}"`;
  execSync(cmd, { stdio: 'ignore' });
}

function main() {
  const opts = parseArgs();
  console.log('--- RecipeHub Frame Sequence Generator ---');
  console.log(`Source: ${opts.source}`);
  console.log(`Output: ${opts.output}`);
  console.log(`Trim: [${opts.start}s - ${opts.end}s]`);

  checkDependencies();
  const info = probeVideo(opts.source);
  console.log(`Video metadata: ${info.width}x${info.height}, ${info.duration.toFixed(2)}s`);

  const outputDir = path.resolve(process.cwd(), opts.output);
  const desktopDir = path.join(outputDir, 'desktop');
  const mobileDir = path.join(outputDir, 'mobile');
  const chaptersDir = path.join(outputDir, 'chapters');

  ensureDir(outputDir);
  ensureDir(chaptersDir);

  // 1. Trích xuất desktop profile
  const desktopStats = extractProfileFrames(
    opts.source,
    desktopDir,
    opts.start,
    opts.end,
    opts.desktopFps,
    opts.desktopQuality
  );

  // 2. Trích xuất mobile profile
  const mobileStats = extractProfileFrames(
    opts.source,
    mobileDir,
    opts.start,
    opts.end,
    opts.mobileFps,
    opts.mobileQuality
  );

  // 3. Fallbacks: Poster và 3 Chapters
  const posterPath = path.join(outputDir, 'poster.webp');
  console.log('Generating poster & chapter fallbacks...');
  extractSingle(opts.source, opts.start, posterPath, 82);

  const chapterFallbackFiles = {
    ingredients: path.join(chaptersDir, 'ingredients.webp'),
    process: path.join(chaptersDir, 'process.webp'),
    drink: path.join(chaptersDir, 'drink.webp'),
  };

  extractSingle(opts.source, 2.5, chapterFallbackFiles.ingredients, 80);
  extractSingle(opts.source, 7.0, chapterFallbackFiles.process, 80);
  extractSingle(opts.source, 11.0, chapterFallbackFiles.drink, 80);

  // 4. Ánh xạ chapter timestamps
  const rawChapters = [
    { id: 'hero', name: 'Mở đầu', time: 0.0, startProgress: 0.0, endProgress: 0.12 },
    { id: 'ingredients', name: 'Nguyên liệu', time: 1.44, startProgress: 0.12, endProgress: 0.34 },
    { id: 'process', name: 'Thao tác & Chế biến', time: 4.38, startProgress: 0.34, endProgress: 0.72 },
    { id: 'drink', name: 'Thành phẩm', time: 10.04, startProgress: 0.72, endProgress: 1.0 },
  ];

  const totalTime = opts.end - opts.start;
  const chapters = rawChapters.map((ch) => {
    const offset = Math.max(0, ch.time - opts.start);
    const fraction = totalTime > 0 ? offset / totalTime : 0;
    const desktopIndex = Math.min(desktopStats.count - 1, Math.round(fraction * (desktopStats.count - 1)));
    const mobileIndex = Math.min(mobileStats.count - 1, Math.round(fraction * (mobileStats.count - 1)));
    return {
      ...ch,
      desktopIndex,
      mobileIndex,
    };
  });

  // 5. Manifest
  const manifest = {
    source: opts.source,
    sourceDuration: info.duration,
    trim: {
      start: opts.start,
      end: opts.end,
      duration: totalTime,
    },
    dimensions: {
      width: info.width,
      height: info.height,
    },
    profiles: {
      desktop: desktopStats,
      mobile: mobileStats,
    },
    chapters,
    fallbacks: {
      poster: 'poster.webp',
      chapters: {
        ingredients: 'chapters/ingredients.webp',
        process: 'chapters/process.webp',
        drink: 'chapters/drink.webp',
      },
    },
    generatedAt: new Date().toISOString(),
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Manifest saved to ${manifestPath}`);
  console.log('Desktop frames:', desktopStats.count, `(${desktopStats.totalBytesFormatted})`);
  console.log('Mobile frames:', mobileStats.count, `(${mobileStats.totalBytesFormatted})`);
  console.log('Done!');
}

main();
