import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDrafts } from '../hooks/useDrafts';
import { useTelegram } from '../hooks/useTelegram';
import { api } from '../utils/api';
import './Dashboard.css';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const { drafts, loading, deleteDraft } = useDrafts();
  const { hapticImpact, hapticNotification } = useTelegram();
  const [showCreate, setShowCreate] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('professional');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;

    setGenerating(true);
    hapticImpact('medium');

    try {
      await api.generate.post({
        input_text: inputText,
        style: selectedStyle,
        use_brand_voice: false,
      });
      
      hapticNotification('success');
      setInputText('');
      setShowCreate(false);
      window.location.reload();
    } catch (error) {
      hapticNotification('error');
      console.error('Generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    hapticImpact('medium');
    try {
      await deleteDraft(id);
      hapticNotification('success');
    } catch (error) {
      hapticNotification('error');
    }
  };

  const handleUpgrade = async () => {
    hapticImpact('medium');
    try {
      await api.upgrade.pro();
      hapticNotification('success');
      setTimeout(() => refreshUser(), 2000);
    } catch (error) {
      hapticNotification('error');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const remainingTransforms = user?.tier === 'pro' ? '∞' : (10 - (user?.transforms_today || 0));

  return (
    <div className="dashboard container">
      <div className="header">
        <h1>🚀 PostPilot</h1>
        <div className="user-info">
          <span className="tier-badge">{user?.tier === 'pro' ? '⭐ Pro' : 'Free'}</span>
          <span className="transforms-count">{remainingTransforms} transforms left</span>
        </div>
      </div>

      {user?.tier === 'free' && user?.transforms_today >= 10 && (
        <div className="paywall-banner">
          <p>Daily limit reached! Upgrade to Pro for unlimited transforms.</p>
          <button className="button" onClick={handleUpgrade}>
            ⭐ Upgrade to Pro
          </button>
        </div>
      )}

      {!showCreate ? (
        <>
          <button 
            className="button create-button" 
            onClick={() => setShowCreate(true)}
          >
            ✨ Create New Post
          </button>

          <div className="drafts-section">
            <h2>Your Drafts ({drafts.length})</h2>
            {drafts.length === 0 ? (
              <div className="empty-state">
                <p>No drafts yet. Create your first post!</p>
              </div>
            ) : (
              <div className="drafts-list">
                {drafts.map((draft: any) => (
                  <div key={draft.id} className="draft-card">
                    <div className="draft-header">
                      <span className="draft-style">{draft.style}</span>
                      <span className="draft-date">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="draft-content">{draft.generated_post}</p>
                    <div className="draft-actions">
                      <button 
                        className="button button-secondary"
                        onClick={() => navigator.clipboard.writeText(draft.generated_post)}
                      >
                        📋 Copy
                      </button>
                      <button 
                        className="button button-secondary"
                        onClick={() => handleDelete(draft.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="create-form">
          <h2>Create New Post</h2>
          <textarea
            className="textarea"
            placeholder="Enter your idea or paste content..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={5}
          />
          
          <div className="style-selector">
            <label>Select Style:</label>
            <div className="style-options">
              {['professional', 'viral', 'funny', 'sales', 'educational'].map((style) => (
                <button
                  key={style}
                  className={`style-button ${selectedStyle === style ? 'active' : ''}`}
                  onClick={() => setSelectedStyle(style)}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button 
              className="button button-secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button 
              className="button"
              onClick={handleGenerate}
              disabled={generating || !inputText.trim()}
            >
              {generating ? 'Generating...' : '✨ Generate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
