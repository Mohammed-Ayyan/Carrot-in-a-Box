import React, { useEffect, useState } from 'react';
import { platformService, PlatformSettings } from '../../platform/PlatformService';

interface SettingsModalProps {
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, isMuted, onToggleMute }) => {
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(platformService.getSettings());
  const [graphicsQuality, setGraphicsQuality] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(() => {
    return (localStorage.getItem('carrot_graphics_quality') as any) || 'HIGH';
  });

  useEffect(() => {
    return platformService.subscribeSettings((settings) => {
      setPlatformSettings(settings);
    });
  }, []);

  const handleGraphicsChange = (quality: 'LOW' | 'MEDIUM' | 'HIGH') => {
    setGraphicsQuality(quality);
    try {
      localStorage.setItem('carrot_graphics_quality', quality);
    } catch {}
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">⚙️</span>
            <h2>Game Settings</h2>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          {/* Audio Setting */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Sound Effects</span>
              <span className="setting-subtext">Game audio and reveal sounds</span>
            </div>
            {platformSettings.muteAudio ? (
              <span className="platform-override-badge" title="Muted by Platform">🔇 Platform Muted</span>
            ) : (
              <button
                className={`toggle-switch ${!isMuted ? 'active' : ''}`}
                onClick={onToggleMute}
              >
                <div className="switch-thumb" />
              </button>
            )}
          </div>

          {/* Chat Setting */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Text Chat</span>
              <span className="setting-subtext">In-game chat panel</span>
            </div>
            {platformSettings.disableChat ? (
              <span className="platform-override-badge" title="Disabled by Platform">🚫 Platform Disabled</span>
            ) : (
              <span className="setting-status-active">Enabled</span>
            )}
          </div>

          {/* Graphics Quality */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-label">Graphics Quality</span>
              <span className="setting-subtext">Shadows & lighting details</span>
            </div>
            <div className="quality-pill-group">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((q) => (
                <button
                  key={q}
                  className={`quality-pill ${graphicsQuality === q ? 'active' : ''}`}
                  onClick={() => handleGraphicsChange(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Info */}
          {platformService.isCrazyGames() && (
            <div className="platform-info-box">
              <span>🎮 Connected to CrazyGames Platform</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="action-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
