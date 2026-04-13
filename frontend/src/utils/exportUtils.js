// Utilitários de exportação — sem dependências externas

// ── EXCEL (CSV com BOM para Excel abrir corretamente em PT) ──────────────
export const exportToExcel = (filename, headers, rows) => {
  const BOM = '\uFEFF';
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(';') || s.includes('\n') || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [
    headers.map(escape).join(';'),
    ...rows.map(row => row.map(escape).join(';')),
  ].join('\n');

  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── PDF (via janela de impressão com CSS dedicado) ───────────────────────
export const exportToPDF = (title, htmlContent) => {
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 12px; color: #1a1a1a; padding: 20px 30px; }
        h1 { font-size: 18px; color: #7C1805; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #7C1805; margin: 16px 0 8px; border-bottom: 1px solid #E8DDD0; padding-bottom: 4px; }
        p.subtitle { font-size: 11px; color: #6B5B4E; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #7C1805; color: white; padding: 6px 10px; text-align: left; font-size: 11px; }
        td { padding: 5px 10px; border-bottom: 1px solid #F0EBE3; font-size: 11px; }
        tr:nth-child(even) td { background: #FAFAFA; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .stat-box { border: 1px solid #E8DDD0; border-radius: 8px; padding: 10px; text-align: center; }
        .stat-value { font-size: 22px; font-weight: bold; color: #7C1805; }
        .stat-label { font-size: 10px; color: #6B5B4E; margin-top: 2px; }
        .footer { margin-top: 20px; font-size: 10px; color: #6B5B4E; text-align: center; border-top: 1px solid #E8DDD0; padding-top: 8px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${htmlContent}
      <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')} — redação com nicolle</div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); win.close(); }, 500);
};
