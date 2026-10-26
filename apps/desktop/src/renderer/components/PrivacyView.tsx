import React from 'react';

interface PrivacyViewProps {
  databasePath?: string;
  onResetData: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ databasePath, onResetData }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Security & Data Privacy Architecture</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          ScreenCare is built around complete data sovereignty, zero telemetry, and verifiable system safety.
        </p>
      </div>

      {/* Security Principles Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        <div className="glass-card">
          <div style={{ fontSize: 24, marginBottom: 10 }}>🔒</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Least Privilege Execution</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            ScreenCare runs under standard user permissions (<code>asInvoker</code>). It never requests administrator
            elevation, installs kernel drivers, or modifies unrelated operating-system registries.
          </p>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: 24, marginBottom: 10 }}>🚫</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Zero Network & Telemetry</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            No accounts, no remote servers, and zero telemetry SDKs. The application enforces a strict Content Security
            Policy with <code>connect-src 'none'</code>, prohibiting any outbound web requests.
          </p>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: 24, marginBottom: 10 }}>🛡️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Strict Content Protection</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            ScreenCare only tracks duration of user activity and system idle state. It never logs keystrokes, active window
            titles, screen pixels, clipboard data, or web browsing history.
          </p>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: 24, marginBottom: 10 }}>⚡</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Hardened Process Isolation</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Renderer processes operate with <code>contextIsolation: true</code>, <code>nodeIntegration: false</code>, and
            strict sandbox constraints. IPC communication is restricted to verified internal channels.
          </p>
        </div>
      </div>

      {/* Local Storage Details */}
      <div className="glass-card">
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Local Storage Assessment</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Application state is stored locally on this computer in a human-readable JSON format with atomic transactional
          file swaps to protect against data corruption:
        </p>
        <code
          style={{
            display: 'block',
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            marginBottom: 16,
            wordBreak: 'break-all',
          }}
        >
          {databasePath || 'C:\\Users\\<User>\\AppData\\Roaming\\ScreenCare\\screencare-data.json'}
        </code>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={onResetData} style={{ color: '#fb7185' }}>
            Purge All Stored Data
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Completely deletes stored break records and restores default settings immediately.
          </span>
        </div>
      </div>

      {/* Audit Checklist */}
      <div className="glass-card">
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Verified Security Controls</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          <div>✅ <strong>Windows Installer:</strong> Built via electron-builder with NSIS and portable target options.</div>
          <div>✅ <strong>Electron Isolation:</strong> Context isolation enabled; direct Node.js access in UI blocked.</div>
          <div>✅ <strong>Network Sandbox:</strong> CSP blocks all remote fetch, XMLHttpRequest, and WebSockets.</div>
          <div>✅ <strong>Windows Autostart:</strong> Optional setting registered through official Electron API, disabled by default.</div>
          <div>✅ <strong>Audit Trails:</strong> Automated dependency audit with zero critical vulnerabilities.</div>
        </div>
      </div>
    </div>
  );
};
