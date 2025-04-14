import React from 'react';
import './HistoryPanel.css';

function HistoryPanel({ history, onSelect }) {
  return (
    <div className="history-panel">
      <h4>🕘 Your History</h4>
      <div className="history-list">
        {history.length === 0 ? (
          <p className="muted">No history yet.</p>
        ) : (
          history.map((item, idx) => (
            <div key={idx} className="history-item" style={{ marginBottom: '1rem', cursor: 'pointer', color: '#007BFF' }}
            onClick={() => onSelect(item)}>
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default HistoryPanel;
