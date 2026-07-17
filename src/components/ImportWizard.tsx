import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { decodeBytes, detectEncodingCandidates } from '../lib/encoding';
import { detectDelimiter, parseDelimitedText } from '../lib/delimited';
import { parseWorksheet, readWorkbook, type WorkbookPreview } from '../lib/spreadsheet';
import type { EncodingCandidate, ParsedTabularData } from '../types';

interface ImportWizardProps {
  file: File;
  onCancel: () => void;
  onImport: (data: ParsedTabularData, metadata: { name: string; sheet?: string; encoding?: string }) => void;
}

const DELIMITER_OPTIONS = [
  { value: ',', label: '逗號 (,)' },
  { value: '\t', label: 'Tab' },
  { value: ';', label: '分號 (;)' },
  { value: '|', label: '直線 (|)' },
];

const TEXT_PREVIEW_BYTE_LIMIT = 2 * 1024 * 1024;
const LARGE_FILE_WARNING_BYTES = 50 * 1024 * 1024;

function decodePreview(buffer: ArrayBuffer, encoding: string): string {
  let length = Math.min(buffer.byteLength, TEXT_PREVIEW_BYTE_LIMIT);
  if (encoding.startsWith('utf-16') && length % 2 !== 0) length -= 1;
  return decodeBytes(new Uint8Array(buffer, 0, Math.max(0, length)), encoding);
}

export function ImportWizard({ file, onCancel, onImport }: ImportWizardProps) {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [workbook, setWorkbook] = useState<WorkbookPreview | null>(null);
  const [sheet, setSheet] = useState('');
  const [encodingCandidates, setEncodingCandidates] = useState<EncodingCandidate[]>([]);
  const [encoding, setEncoding] = useState('utf-8');
  const [decodedText, setDecodedText] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [headerRow, setHeaderRow] = useState(0);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isSpreadsheet = ['xlsx', 'xls', 'xlsm', 'xlsb'].includes(extension);

  useEffect(() => {
    let cancelled = false;
    file.arrayBuffer().then((result) => {
      if (cancelled) return;
      setBuffer(result);
      if (isSpreadsheet) {
        try {
          const parsed = readWorkbook(result);
          setWorkbook(parsed);
          setSheet(parsed.sheetNames[0] ?? '');
        } catch (reason) {
          setError(`無法讀取 Excel：${reason instanceof Error ? reason.message : '未知錯誤'}`);
        }
      } else {
        const candidates = detectEncodingCandidates(result);
        setEncodingCandidates(candidates);
        const selected = candidates[0]?.encoding ?? 'utf-8';
        setEncoding(selected);
        const previewText = decodePreview(result, selected);
        setDecodedText(previewText);
        setDelimiter(detectDelimiter(previewText));
      }
    }).catch((reason: unknown) => {
      setError(`無法讀取檔案：${reason instanceof Error ? reason.message : '未知錯誤'}`);
    });
    return () => { cancelled = true; };
  }, [file, isSpreadsheet]);

  function changeEncoding(nextEncoding: string) {
    if (!buffer) return;
    setEncoding(nextEncoding);
    setError('');
    const previewText = decodePreview(buffer, nextEncoding);
    setDecodedText(previewText);
    setDelimiter(detectDelimiter(previewText));
  }

  const previewMatrix = useMemo<unknown[][]>(() => {
    if (isSpreadsheet) return workbook?.matrices[sheet]?.slice(0, 15) ?? [];
    if (!decodedText) return [];
    const result = Papa.parse<unknown[]>(decodedText.slice(0, 2_000_000), {
      delimiter,
      preview: 15,
      skipEmptyLines: false,
      dynamicTyping: false,
    });
    return result.data;
  }, [decodedText, delimiter, isSpreadsheet, workbook, sheet]);

  async function confirmImport() {
    if (!buffer || importing) return;
    setError('');
    setImporting(true);

    // Allow React to paint the busy state before the synchronous parse starts.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 30));

    try {
      const parsed = isSpreadsheet
        ? parseWorksheet(workbook?.matrices[sheet] ?? [], headerRow)
        : parseDelimitedText(decodeBytes(new Uint8Array(buffer), encoding), delimiter, headerRow);
      if (!parsed.columns.length) throw new Error('找不到可使用的欄位名稱。');
      if (!parsed.rows.length) throw new Error('找不到可匯入的資料列。');
      onImport(parsed, {
        name: file.name.replace(/\.[^.]+$/, ''),
        sheet: isSpreadsheet ? sheet : undefined,
        encoding: isSpreadsheet ? undefined : encoding,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '匯入失敗。');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="modal-header">
          <div>
            <h2 id="import-title">資料匯入精靈</h2>
            <p>{file.name}｜{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button className="icon-button large" onClick={onCancel}>×</button>
        </div>

        {error && <div className="error-box">{error}</div>}
        {file.size >= LARGE_FILE_WARNING_BYTES && !isSpreadsheet && (
          <div className="info-box large-file-warning">
            此檔案超過 50 MB。預覽只讀取前 2 MB；按下確認匯入後才會解析完整檔案。
            v0.1 仍會把結果保留在瀏覽器記憶體中，處理時間及可用筆數取決於電腦記憶體。
          </div>
        )}
        {!buffer && !error && <div className="loading">正在讀取檔案…</div>}

        {buffer && (
          <div className="import-layout">
            <div className="import-settings">
              {isSpreadsheet ? (
                <label>工作表<select value={sheet} onChange={(event) => { setSheet(event.target.value); setHeaderRow(0); }}>{workbook?.sheetNames.map((name) => <option key={name}>{name}</option>)}</select></label>
              ) : (
                <>
                  <label>文字編碼<select value={encoding} onChange={(event) => changeEncoding(event.target.value)}>{encodingCandidates.map((candidate) => <option key={candidate.encoding} value={candidate.encoding}>{candidate.label}（評分 {candidate.score.toFixed(0)}）</option>)}</select></label>
                  <label>分隔符號<select value={delimiter} onChange={(event) => setDelimiter(event.target.value)}>{DELIMITER_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                  <div className="candidate-list">
                    <strong>編碼候選</strong>
                    {encodingCandidates.slice(0, 4).map((candidate) => (
                      <div key={candidate.encoding} className={candidate.encoding === encoding ? 'selected-candidate' : ''}>
                        <span>{candidate.label}</span>
                        <small>� {candidate.replacementCount}｜控制字元 {candidate.controlCount}</small>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <label>表頭所在列<input type="number" min={1} max={Math.max(1, previewMatrix.length)} value={headerRow + 1} onChange={(event) => setHeaderRow(Math.max(0, Number(event.target.value) - 1))} /></label>
              <div className="info-box">請確認欄位名稱與中文內容正常。自動編碼判斷不是百分之百準確，可切換候選編碼比較預覽。</div>
            </div>
            <div className="preview-pane">
              <div className="preview-heading">前 15 列原始預覽</div>
              <div className="preview-scroll">
                <table className="preview-table">
                  <tbody>
                    {previewMatrix.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex === headerRow ? 'header-row-selected' : ''} onClick={() => setHeaderRow(rowIndex)}>
                        <th>{rowIndex + 1}</th>
                        {row.slice(0, 30).map((cell, cellIndex) => <td key={cellIndex}>{String(cell ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button disabled={importing} onClick={onCancel}>取消</button>
          <button className="primary" disabled={!buffer || Boolean(error) || importing} onClick={confirmImport}>{importing ? '正在解析完整檔案…' : '確認匯入'}</button>
        </div>
      </section>
    </div>
  );
}
