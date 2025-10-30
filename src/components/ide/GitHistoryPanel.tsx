import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  commits,
  status,
  refreshHistory,
  refreshStatus,
  isRepo,
  selectCommit,
  selectedCommit,
  commit as doCommit,
  unpushedSet,
} from "../../stores/gitStore";
import "../../css/GitHistoryPanel.css";

const GitHistoryPanel: React.FC = () => {
  const [message, setMessage] = useState("");
  const [stageAll, setStageAll] = useState(true);

  useEffect(() => {
    refreshHistory(100);
    refreshStatus();
  }, []);

  const changes = useMemo(() => status(), []);
  const unpushed = useMemo(() => unpushedSet(), []);
  const history = useMemo(() => commits(), []);
  const selected = useMemo(() => selectedCommit(), []);
  const repoDetected = useMemo(() => isRepo(), []);

  const handleCommitConfirm = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    await doCommit(trimmed, stageAll);
    setMessage("");
  }, [message, stageAll]);

  const handleRefresh = useCallback(() => {
    refreshHistory();
  }, []);

  return (
    <div className="git-history-panel">
      <div className="git-toolbar">
        <h3>Git</h3>
        <button className="btn" onClick={handleRefresh}>
          Refresh
        </button>
      </div>

      {repoDetected ? (
        <div className="git-layout">
          <div className="git-left">
            <div className="commit-box">
              <textarea
                className="commit-input"
                placeholder="Commit message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <div className="commit-controls">
                <label className="stage-all">
                  <input
                    type="checkbox"
                    checked={stageAll}
                    onChange={(event) => setStageAll(event.target.checked)}
                  />
                  Stage all changes (git add -A)
                </label>
                <div className="commit-actions">
                  <button className="btn ghost" onClick={() => setMessage("")}>
                    Cancel
                  </button>
                  <button className="btn primary" onClick={handleCommitConfirm} disabled={!message.trim()}>
                    Commit
                  </button>
                </div>
              </div>
            </div>

            <div className="changes">
              <div className="section-header">Changes</div>
              {changes.length > 0 ? (
                <ul className="changes-list">
                  {changes.map((entry) => (
                    <li key={`${entry.code}-${entry.path}`} className="change-item">
                      <span className="code">{entry.code}</span>
                      <span className="path">{entry.path}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty">No changes detected.</div>
              )}
            </div>
          </div>

          <div className="git-right">
            <div className="section-header">History</div>
            {history.length === 0 ? (
              <div className="empty">Loading history...</div>
            ) : (
              <ul className="commits-list">
                {history.map((commit) => {
                  const isSelected = selected === commit.hash;
                  const isUnpushed = unpushed.has(commit.hash);
                  return (
                    <li
                      key={commit.hash}
                      className={`commit-item ${isSelected ? "selected" : ""} ${isUnpushed ? "unpushed" : "pushed"}`}
                      onClick={() => selectCommit(commit.hash)}
                    >
                      <div className="commit-meta">
                        <span className="commit-message">{commit.message}</span>
                        <span className="commit-author">{commit.author}</span>
                        <span className="commit-date">{commit.date}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="empty">This project is not a Git repository.</div>
      )}
    </div>
  );
};

export default GitHistoryPanel;
