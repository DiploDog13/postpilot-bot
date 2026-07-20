import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';
import { api } from '../utils/api';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { hapticImpact, hapticNotification } = useTelegram();
  const [brandVoiceName, setBrandVoiceName] = useState('');
  const [brandVoiceTone, setBrandVoiceTone] = useState('');
  const [brandVoiceExamples, setBrandVoiceExamples] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveBrandVoice = async () => {
    if (!brandVoiceName.trim() || !brandVoiceExamples.trim()) return;

    setSaving(true);
    hapticImpact('medium');

    try {
      const examples = brandVoiceExamples.split('\n').filter(e => e.trim());
      await api.brandVoices.create({
        name: brandVoiceName,
        tone: brandVoiceTone,
        examples,
      });
      
      hapticNotification('success');
      setBrandVoiceName('');
      setBrandVoiceTone('');
      setBrandVoiceExamples('');
    } catch (error) {
      hapticNotification('error');
      console.error('Failed to save brand voice:', error);
    } finally {
      setSaving(false);
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

  return (
    <div className="settings container">
      <h1>⚙️ Settings</h1>

      <div className="settings-section">
        <h2>Subscription</h2>
        <div className="subscription-card">
          <div className="current-tier">
            <span className="tier-badge large">
              {user?.tier === 'pro' ? '⭐ Pro' : 'Free'}
            </span>
            {user?.tier === 'pro' && user?.subscription_end && (
              <p className="expiry">
                Expires: {new Date(user.subscription_end).toLocaleDateString()}
              </p>
            )}
          </div>
          
          {user?.tier === 'free' && (
            <button className="button" onClick={handleUpgrade}>
              ⭐ Upgrade to Pro (500 Stars)
            </button>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2>Brand Voice</h2>
        <p className="section-description">
          Upload 3-5 examples of your past posts to train the AI on your unique voice.
        </p>
        
        <div className="brand-voice-form">
          <input
            className="input"
            placeholder="Voice name (e.g., 'My Tech Blog')"
            value={brandVoiceName}
            onChange={(e) => setBrandVoiceName(e.target.value)}
          />
          
          <textarea
            className="textarea"
            placeholder="Describe your tone (e.g., 'Professional but friendly, tech-focused')"
            value={brandVoiceTone}
            onChange={(e) => setBrandVoiceTone(e.target.value)}
            rows={3}
          />
          
          <textarea
            className="textarea"
            placeholder="Paste your past posts (one per line)..."
            value={brandVoiceExamples}
            onChange={(e) => setBrandVoiceExamples(e.target.value)}
            rows={6}
          />
          
          <button
            className="button"
            onClick={handleSaveBrandVoice}
            disabled={saving || !brandVoiceName.trim() || !brandVoiceExamples.trim()}
          >
            {saving ? 'Saving...' : '💾 Save Brand Voice'}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2>Account Info</h2>
        <div className="account-info">
          <p><strong>Username:</strong> {user?.username || 'N/A'}</p>
          <p><strong>Transforms today:</strong> {user?.transforms_today || 0}</p>
          <p><strong>Referrals:</strong> {user?.referred_count || 0}</p>
        </div>
      </div>
    </div>
  );
}
