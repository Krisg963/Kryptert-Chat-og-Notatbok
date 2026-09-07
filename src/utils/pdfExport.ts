import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Folder, Note } from '../types';

export async function exportNoteToPDF(elementId: string, noteTitle: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element for PDF export not found:', elementId);
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#09090b',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pdfWidth - margin * 2;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
    heightLeft -= (pdfHeight - margin * 2);

    while (heightLeft > 0) {
      pdf.addPage();
      position = heightLeft - imgHeight + margin;
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
      heightLeft -= (pdfHeight - margin * 2);
    }

    const safeTitle = (noteTitle || 'notat')
      .replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_')
      .slice(0, 40);

    pdf.save(`${safeTitle}.pdf`);
    return true;
  } catch (err) {
    console.error('Feil under eksport til PDF:', err);
    window.print();
    return false;
  }
}

/**
 * Exports an entire folder and all its notes into a comprehensive combined PDF report.
 */
export async function exportFolderToPDF(folder: Folder, notes: Note[]): Promise<boolean> {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pdfWidth - margin * 2;

    // --- COVER / TITLE PAGE ---
    // Dark background banner
    pdf.setFillColor(24, 24, 27); // neutral-900
    pdf.rect(0, 0, pdfWidth, 65, 'F');

    // Folder Color Accent line
    const hex = folder.color || '#6366f1';
    const r = parseInt(hex.slice(1, 3), 16) || 99;
    const g = parseInt(hex.slice(3, 5), 16) || 102;
    const b = parseInt(hex.slice(5, 7), 16) || 241;
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 65, pdfWidth, 4, 'F');

    // Title & Folder Metadata
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.text(folder.name, margin, 35);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(161, 161, 170);
    pdf.text(`Mappe-rapport • ${notes.length} notater • Eksportert ${new Date().toLocaleDateString('no-NO')}`, margin, 48);

    // Table of Contents Section
    let currentY = 85;
    pdf.setTextColor(30, 30, 35);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Innholdsfortegnelse', margin, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 90);

    notes.forEach((note, index) => {
      const itemTitle = `${index + 1}. ${note.title || 'Uten tittel'}`;
      const itemDate = new Date(note.updatedAt).toLocaleDateString('no-NO');
      pdf.text(itemTitle, margin, currentY);
      pdf.text(itemDate, pdfWidth - margin - 20, currentY);
      currentY += 7;

      if (currentY > pdfHeight - 30 && index < notes.length - 1) {
        pdf.addPage();
        currentY = 25;
      }
    });

    // --- INDIVIDUAL NOTES PAGES ---
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      pdf.addPage();
      let y = 25;

      // Note Header Bar
      pdf.setFillColor(r, g, b);
      pdf.rect(margin, y, 4, 18, 'F');

      pdf.setTextColor(20, 20, 25);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      const titleLines = pdf.splitTextToSize(note.title || 'Uten tittel', contentWidth - 10);
      pdf.text(titleLines, margin + 8, y + 6);

      y += 16 + (titleLines.length - 1) * 6;

      // Metadata line
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(110, 110, 120);
      const meta = `Sist endret: ${new Date(note.updatedAt).toLocaleString('no-NO')} | Tagger: ${note.tags.map(t => '#' + t).join(' ') || 'Ingen'}`;
      pdf.text(meta, margin, y);
      y += 6;

      // Separator line
      pdf.setDrawColor(220, 220, 230);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pdfWidth - margin, y);
      y += 8;

      // Clean plain Markdown text for PDF print
      const cleanContent = note.content
        .replace(/!\[(.*?)\]\((.*?)\)/g, '[Bilde: $1]')
        .replace(/```[a-z]*\n([\s\S]*?)```/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#+\s+/gm, '')
        .replace(/^>\s+/gm, '   | ');

      const paragraphs = cleanContent.split('\n');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(40, 40, 45);

      for (const p of paragraphs) {
        if (!p.trim()) {
          y += 4;
          continue;
        }

        const lines = pdf.splitTextToSize(p, contentWidth);
        for (const line of lines) {
          if (y > pdfHeight - 20) {
            pdf.addPage();
            y = 25;
          }
          pdf.text(line, margin, y);
          y += 5.5;
        }
      }

      // Add attached images if any exist
      if (note.images && note.images.length > 0) {
        for (const img of note.images) {
          try {
            if (y > pdfHeight - 60) {
              pdf.addPage();
              y = 25;
            }
            // Check if base64 data url
            if (img.startsWith('data:image')) {
              pdf.addImage(img, 'JPEG', margin, y, 70, 45);
              y += 50;
            }
          } catch {
            // Ignore corrupted inline images in PDF
          }
        }
      }

      // Page footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 160);
      pdf.text(
        `${folder.name} • Side ${pdf.getNumberOfPages()}`,
        margin,
        pdfHeight - 10
      );
    }

    const safeName = (folder.name || 'mappe')
      .replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_')
      .slice(0, 30);

    pdf.save(`${safeName}_samling.pdf`);
    return true;
  } catch (err) {
    console.error('Feil under eksport av mappe til PDF:', err);
    return false;
  }
}

/**
 * Exports a user-selected set of notes into a comprehensive combined PDF document.
 */
export async function exportSelectedNotesToPDF(
  selectedNotes: Note[],
  folderMap?: Map<string, Folder>,
  documentTitle = 'Valgte notater'
): Promise<boolean> {
  if (!selectedNotes || selectedNotes.length === 0) {
    return false;
  }

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pdfWidth - margin * 2;

    // --- COVER / TITLE BANNER ---
    pdf.setFillColor(24, 24, 27); // neutral-900
    pdf.rect(0, 0, pdfWidth, 68, 'F');

    // Accent Line
    pdf.setFillColor(99, 102, 241); // indigo-500
    pdf.rect(0, 68, pdfWidth, 4, 'F');

    // Document Title
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.text(documentTitle, margin, 35);

    // Subtitle & Metadata
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(161, 161, 170);
    pdf.text(
      `Eksportert samling • ${selectedNotes.length} ${selectedNotes.length === 1 ? 'notat' : 'notater'} • ${new Date().toLocaleDateString('no-NO', { dateStyle: 'long' })}`,
      margin,
      50
    );

    // Table of Contents
    let currentY = 90;
    pdf.setTextColor(30, 30, 35);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Innholdsfortegnelse', margin, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    selectedNotes.forEach((note, index) => {
      const folderName = folderMap?.get(note.folderId)?.name || 'Generelt';
      const itemTitle = `${index + 1}. ${note.title || 'Uten tittel'}`;
      const itemInfo = `${folderName} • ${new Date(note.updatedAt).toLocaleDateString('no-NO')}`;

      pdf.setTextColor(40, 40, 50);
      pdf.text(itemTitle, margin, currentY);

      pdf.setTextColor(130, 130, 140);
      pdf.text(itemInfo, pdfWidth - margin - 50, currentY);
      currentY += 7;

      if (currentY > pdfHeight - 30 && index < selectedNotes.length - 1) {
        pdf.addPage();
        currentY = 25;
      }
    });

    // --- INDIVIDUAL NOTES ---
    for (let i = 0; i < selectedNotes.length; i++) {
      const note = selectedNotes[i];
      const folder = folderMap?.get(note.folderId);
      pdf.addPage();
      let y = 25;

      // Note Header color accent bar
      const folderColor = folder?.color || '#6366f1';
      const r = parseInt(folderColor.slice(1, 3), 16) || 99;
      const g = parseInt(folderColor.slice(3, 5), 16) || 102;
      const b = parseInt(folderColor.slice(5, 7), 16) || 241;

      pdf.setFillColor(r, g, b);
      pdf.rect(margin, y, 4, 18, 'F');

      // Title
      pdf.setTextColor(20, 20, 25);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      const titleLines = pdf.splitTextToSize(note.title || 'Uten tittel', contentWidth - 10);
      pdf.text(titleLines, margin + 8, y + 6);

      y += 16 + (titleLines.length - 1) * 6;

      // Metadata line
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(110, 110, 120);
      const meta = `Mappe: ${folder?.name || 'Uten mappe'} | Sist endret: ${new Date(note.updatedAt).toLocaleString('no-NO')} | Tagger: ${note.tags.map(t => '#' + t).join(' ') || 'Ingen'}`;
      pdf.text(meta, margin, y);
      y += 6;

      // Separator line
      pdf.setDrawColor(225, 225, 235);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pdfWidth - margin, y);
      y += 8;

      // Render Markdown content to plain text with clear formatting
      const cleanContent = note.content
        .replace(/!\[(.*?)\]\((.*?)\)/g, '[Bilde: $1]')
        .replace(/```[a-z]*\n([\s\S]*?)```/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#+\s+/gm, '')
        .replace(/^>\s+/gm, '   | ');

      const paragraphs = cleanContent.split('\n');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(40, 40, 45);

      for (const p of paragraphs) {
        if (!p.trim()) {
          y += 4;
          continue;
        }

        const lines = pdf.splitTextToSize(p, contentWidth);
        for (const line of lines) {
          if (y > pdfHeight - 20) {
            pdf.addPage();
            y = 25;
          }
          pdf.text(line, margin, y);
          y += 5.5;
        }
      }

      // Add attached images if any exist
      if (note.images && note.images.length > 0) {
        for (const img of note.images) {
          try {
            if (y > pdfHeight - 60) {
              pdf.addPage();
              y = 25;
            }
            if (img.startsWith('data:image')) {
              pdf.addImage(img, 'JPEG', margin, y, 75, 48);
              y += 52;
            }
          } catch {
            // Ignore inline image error
          }
        }
      }

      // Page footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 160);
      pdf.text(
        `Valgte notater (${i + 1} av ${selectedNotes.length}) • Side ${pdf.getNumberOfPages()}`,
        margin,
        pdfHeight - 10
      );
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    pdf.save(`valgte_notater_${timestamp}.pdf`);
    return true;
  } catch (err) {
    console.error('Feil under eksport av valgte notater til PDF:', err);
    return false;
  }
}
