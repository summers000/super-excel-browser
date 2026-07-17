import type { DataTableModel } from '../types';

interface ProfilePanelProps {
  table: DataTableModel;
}

export function ProfilePanel({ table }: ProfilePanelProps) {
  const totalNulls = table.profiles.reduce((sum, profile) => sum + profile.nullCount + profile.emptyStringCount + profile.whitespaceOnlyCount, 0);
  const totalSuspicious = table.profiles.reduce((sum, profile) => sum + profile.suspiciousTextCount, 0);
  const totalInvalid = table.profiles.reduce((sum, profile) => sum + profile.invalidCount, 0);

  return (
    <div className="panel-content">
      <h2>資料品質概況</h2>
      <p className="panel-description">系統以欄位抽樣及整體計數建立概況；型態推測與亂碼偵測屬提示，仍應由使用者確認。</p>
      <div className="metric-grid">
        <div className="metric"><strong>{table.rows.length.toLocaleString()}</strong><span>資料筆數</span></div>
        <div className="metric"><strong>{table.columns.length}</strong><span>欄位數</span></div>
        <div className="metric"><strong>{totalNulls.toLocaleString()}</strong><span>空值／空白</span></div>
        <div className="metric"><strong>{totalSuspicious.toLocaleString()}</strong><span>疑似亂碼</span></div>
        <div className="metric"><strong>{totalInvalid.toLocaleString()}</strong><span>型態異常</span></div>
      </div>
      <div className="profile-list">
        {table.profiles.map((profile) => (
          <details key={profile.name} className="profile-card">
            <summary>
              <div>
                <strong>{profile.name}</strong>
                <span className="type-pill">{profile.inferredType}</span>
              </div>
              <span className={profile.suspiciousTextCount + profile.invalidCount ? 'warning-text' : 'muted'}>
                {profile.uniqueCountIsLowerBound ? '至少 ' : ''}{profile.uniqueCount.toLocaleString()} 個不重複值
              </span>
            </summary>
            <div className="profile-details">
              <dl>
                <div><dt>Null</dt><dd>{profile.nullCount.toLocaleString()}</dd></div>
                <div><dt>空字串</dt><dd>{profile.emptyStringCount.toLocaleString()}</dd></div>
                <div><dt>只有空白</dt><dd>{profile.whitespaceOnlyCount.toLocaleString()}</dd></div>
                <div><dt>重複筆數</dt><dd>{profile.duplicateCount.toLocaleString()}</dd></div>
                <div><dt>疑似亂碼</dt><dd>{profile.suspiciousTextCount.toLocaleString()}</dd></div>
                <div><dt>無效值</dt><dd>{profile.invalidCount.toLocaleString()}</dd></div>
                {profile.min !== undefined && <div><dt>最小值</dt><dd>{String(profile.min)}</dd></div>}
                {profile.max !== undefined && <div><dt>最大值</dt><dd>{String(profile.max)}</dd></div>}
                {profile.average !== undefined && <div><dt>平均值</dt><dd>{profile.average.toLocaleString()}</dd></div>}
              </dl>
              <div>
                <strong>常見值{profile.uniqueCountIsLowerBound ? '（大型資料受限統計）' : ''}</strong>
                <ul className="common-values">
                  {profile.commonValues.map((item) => (
                    <li key={item.value}><span>{item.value || '(空白)'}</span><b>{item.count.toLocaleString()}</b></li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
