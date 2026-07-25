import { db } from '@/lib/db';

const HF_API = 'https://huggingface.co/api';
const HF_S3 = 'https://s3.hf.co';

interface HFFile {
  path: string;
  size: number;
  lastModified: string;
  etag: string;
}

interface SyncResult {
  filesFound: number;
  newFiles: number;
  errors: number;
  duration: number;
  status: string;
  message: string;
}

function getHeaders() {
  return { Authorization: `Bearer ${process.env.HF_TOKEN}` };
}

export async function listHFFiles(repoId: string): Promise<HFFile[]> {
  const files: HFFile[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${HF_API}/repos/${repoId}/tree/main?offset=${offset}&limit=${limit}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      if (item.type === 'file' && /\.(mp4|mkv|webm|avi|mov)$/i.test(item.path)) {
        files.push({
          path: item.path,
          size: item.size || 0,
          lastModified: item.lastModified || new Date().toISOString(),
          etag: item.etag || '',
        });
      }
    }

    offset += limit;
    if (data.length < limit) break;
  }

  return files;
}

function extractTitle(filename: string): string {
  return filename
    .replace(/\.(mp4|mkv|webm|avi|mov)$/i, '')
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectType(title: string): 'MOVIE' | 'SERIES' | 'ANIME' {
  const lower = title.toLowerCase();
  if (/season|episode|ep\b|s\d|e\d/i.test(lower)) return 'SERIES';
  if (/anime|naruto|onepiece|one piece|dragon|attack|demon|jujutsu|bleach|berserk/i.test(lower)) return 'ANIME';
  return 'MOVIE';
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);
}

function getVideoUrl(path: string): string {
  const bucket = process.env.HF_BUCKET || '';
  return `${HF_S3}/${bucket}/resolve/main/${encodeURIComponent(path)}`;
}

export async function syncContent(): Promise<SyncResult> {
  const start = Date.now();
  const repoId = process.env.HF_BUCKET || '';
  if (!repoId) return { filesFound: 0, newFiles: 0, errors: 1, duration: 0, status: 'error', message: 'HF_BUCKET not set' };

  try {
    const files = await listHFFiles(repoId);
    let newFiles = 0;
    let errors = 0;

    for (const file of files) {
      try {
        const existing = await db.content.findFirst({
          where: { huggingFaceUrl: { contains: file.path } },
        });
        if (existing) continue;

        const title = extractTitle(file.path);
        const type = detectType(title);
        const slug = generateSlug(title);
        const videoUrl = getVideoUrl(file.path);

        await db.content.create({
          data: {
            title,
            slug,
            type,
            description: `Synced from HuggingFace: ${file.path}`,
            videoUrl,
            huggingFaceUrl: file.path,
            published: true,
          },
        });
        newFiles++;
      } catch {
        errors++;
      }
    }

    const duration = Date.now() - start;
    const status = errors > 0 ? 'partial' : 'success';
    const message = `Found ${files.length} files, ${newFiles} new, ${errors} errors`;

    await db.syncLog.create({
      data: { status, message, filesFound: files.length, newFiles, errors, duration },
    });

    return { filesFound: files.length, newFiles, errors, duration, status, message };
  } catch (err) {
    const duration = Date.now() - start;
    const message = err instanceof Error ? err.message : 'Unknown error';
    await db.syncLog.create({
      data: { status: 'error', message, filesFound: 0, newFiles: 0, errors: 1, duration },
    });
    return { filesFound: 0, newFiles: 0, errors: 1, duration, status: 'error', message };
  }
}
