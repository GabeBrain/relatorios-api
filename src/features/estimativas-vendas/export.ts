export function downloadJson(name: string, value: unknown) { download(name, 'application/json', JSON.stringify(value, null, 2)); }
export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
    if (!rows.length)
        return;
    const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    download(name, 'text/csv;charset=utf-8', [keys.map(cell).join(','), ...rows.map(row => keys.map(key => cell(row[key])).join(','))].join('\r\n'));
}
function download(name: string, type: string, content: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
