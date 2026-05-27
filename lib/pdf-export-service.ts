import { Memory, FamilyMember } from '@/shared/app-types';
import { THEME_META } from '@/constants/prompts';

/**
 * Service for generating PDF exports of the family vault.
 * This is a stub that prepares data for PDF generation.
 * In production, this would integrate with a backend service or library like react-pdf or pdfkit.
 */

export interface PDFExportOptions {
  title?: string;
  includeTranscripts?: boolean;
  includeNotes?: boolean;
  includePhotos?: boolean;
  theme?: 'light' | 'dark' | 'sepia';
}

export interface PDFExportData {
  title: string;
  subtitle: string;
  generatedDate: string;
  totalMemories: number;
  totalDuration: string;
  members: FamilyMember[];
  memories: Array<{
    id: string;
    title: string;
    theme: string;
    date: string;
    recordedBy: string;
    duration: string;
    transcript?: string;
    notes?: string;
    photoUri?: string;
  }>;
}

/**
 * Prepare memory data for PDF export
 */
export function preparePDFExportData(
  memories: Memory[],
  members: FamilyMember[],
  vaultName: string,
  options: PDFExportOptions = {}
): PDFExportData {
  const {
    title = `${vaultName} - Legacy Book`,
    includeTranscripts = true,
    includeNotes = true,
    includePhotos = true,
  } = options;

  // Calculate total duration
  const totalSeconds = memories.reduce((sum, m) => sum + (m.durationSeconds ?? 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const totalDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Format memories for PDF
  const formattedMemories = memories.map(memory => {
    const themeMeta = THEME_META[memory.theme];
    const date = new Date(memory.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const duration = memory.durationSeconds
      ? `${Math.floor(memory.durationSeconds / 60)}:${String(memory.durationSeconds % 60).padStart(2, '0')}`
      : '—';

    return {
      id: memory.id,
      title: memory.title,
      theme: themeMeta?.label ?? 'Memory',
      date,
      recordedBy: memory.recordedBy ?? 'Family Member',
      duration,
      transcript: includeTranscripts ? memory.transcript : undefined,
      notes: includeNotes ? memory.notes : undefined,
      photoUri: includePhotos ? memory.photoUri : undefined,
    };
  });

  return {
    title,
    subtitle: `A collection of family stories and memories`,
    generatedDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    totalMemories: memories.length,
    totalDuration,
    members,
    memories: formattedMemories,
  };
}

/**
 * Generate HTML representation of the PDF (for web preview or server-side rendering)
 */
export function generatePDFHTML(data: PDFExportData): string {
  const memberList = data.members.map(m => `<li>${m.name} (${m.role})</li>`).join('');
  const memoriesList = data.memories
    .map(
      m => `
    <div class="memory-entry">
      <h3>${m.title}</h3>
      <div class="memory-meta">
        <span class="theme">${m.theme}</span>
        <span class="date">${m.date}</span>
        <span class="recorder">By ${m.recordedBy}</span>
        <span class="duration">${m.duration}</span>
      </div>
      ${m.transcript ? `<div class="transcript"><strong>Transcript:</strong><p>${m.transcript}</p></div>` : ''}
      ${m.notes ? `<div class="notes"><strong>Notes:</strong><p>${m.notes}</p></div>` : ''}
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    body {
      font-family: 'Georgia', serif;
      line-height: 1.6;
      color: #333;
      background: #f5f1e8;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 60px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .cover {
      text-align: center;
      border-bottom: 3px solid #C8860A;
      padding-bottom: 40px;
      margin-bottom: 40px;
    }
    .cover h1 {
      font-size: 48px;
      margin: 20px 0;
      color: #5C3D2E;
    }
    .cover p {
      font-size: 18px;
      color: #8B6F47;
      font-style: italic;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
      padding: 20px;
      background: #F5E6D3;
      border-radius: 8px;
    }
    .stat {
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      color: #C8860A;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
    }
    .members {
      margin: 30px 0;
      padding: 20px;
      background: #F9F6F0;
      border-left: 4px solid #C8860A;
    }
    .members h2 {
      color: #5C3D2E;
      margin-top: 0;
    }
    .members ul {
      list-style: none;
      padding: 0;
    }
    .members li {
      padding: 8px 0;
      color: #666;
    }
    .memories {
      margin-top: 40px;
    }
    .memories h2 {
      color: #5C3D2E;
      border-bottom: 2px solid #C8860A;
      padding-bottom: 10px;
    }
    .memory-entry {
      margin: 30px 0;
      padding: 20px;
      background: #FAFAF8;
      border-radius: 8px;
      page-break-inside: avoid;
    }
    .memory-entry h3 {
      margin: 0 0 10px 0;
      color: #5C3D2E;
      font-size: 22px;
    }
    .memory-meta {
      display: flex;
      gap: 15px;
      font-size: 12px;
      color: #999;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }
    .theme {
      background: #E8D5C4;
      padding: 4px 8px;
      border-radius: 4px;
      color: #5C3D2E;
    }
    .transcript, .notes {
      margin: 15px 0;
      padding: 15px;
      background: white;
      border-left: 3px solid #C8860A;
      border-radius: 4px;
    }
    .transcript strong, .notes strong {
      color: #C8860A;
    }
    .footer {
      text-align: center;
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #999;
      font-size: 12px;
    }
    @media print {
      body { background: white; }
      .container { box-shadow: none; padding: 40px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="cover">
      <h1>📖 ${data.title}</h1>
      <p>${data.subtitle}</p>
      <p style="margin-top: 30px; color: #999; font-size: 14px;">Generated on ${data.generatedDate}</p>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-number">${data.totalMemories}</div>
        <div class="stat-label">Stories</div>
      </div>
      <div class="stat">
        <div class="stat-number">${data.totalDuration}</div>
        <div class="stat-label">Recorded</div>
      </div>
    </div>

    <div class="members">
      <h2>Family Members</h2>
      <ul>
        ${memberList}
      </ul>
    </div>

    <div class="memories">
      <h2>Stories</h2>
      ${memoriesList}
    </div>

    <div class="footer">
      <p>This Legacy Book was created with LegacyBox — Preserve the stories behind the photos.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Create a downloadable PDF file (stub for client-side)
 * In production, this would use a library like react-pdf or send data to a backend service
 */
export async function downloadLegacyBookPDF(
  memories: Memory[],
  members: FamilyMember[],
  vaultName: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const data = preparePDFExportData(memories, members, vaultName, options);
  const html = generatePDFHTML(data);

  // For now, this is a stub. In a real app, you would:
  // 1. Send HTML to a backend service (e.g., headless Chrome, wkhtmltopdf)
  // 2. Use a library like react-pdf or pdfkit
  // 3. Generate the PDF and return a download URL

  console.log('PDF Export Data:', data);
  console.log('PDF HTML generated. In production, this would be sent to a PDF generation service.');

  // Return the HTML for preview or server processing
  return Promise.resolve();
}

/**
 * Share PDF export as a file or email
 */
export async function shareLegacyBook(
  memories: Memory[],
  members: FamilyMember[],
  vaultName: string,
  method: 'email' | 'file' = 'file'
): Promise<void> {
  const data = preparePDFExportData(memories, members, vaultName);

  if (method === 'email') {
    // Stub for email sharing
    console.log('Email share stub:', data);
  } else {
    // Stub for file download
    console.log('File download stub:', data);
  }
}
