/**
 * ProfilePage — User profile management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usersApi } from '../api/services';
import { useToastContext } from '../contexts/ToastContext';
import { getAvatarColor } from '../utils/dates';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const { user, setAuth } = useAuthStore();

  // Profile form
  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user || !name.trim() || savingProfile) return;

    setSavingProfile(true);
    try {
      const res = await usersApi.update(user.id, { name: name.trim() });
      const updatedUser = res.data;
      // Update store and localStorage
      const token = localStorage.getItem('token') || '';
      const refreshToken = localStorage.getItem('refresh_token') || undefined;
      setAuth(updatedUser, token, refreshToken);
      toast.success('Perfil atualizado');
    } catch {
      toast.error('Falha ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Nova senha e confirmação não conferem');
      return;
    }

    setSavingPassword(true);
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      toast.success('Senha alterada com sucesso');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message || 'Falha ao alterar senha';
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return null;

  const avatarColor = getAvatarColor(user.name);

  return (
    <div className="profile-container">
      <header className="profile-header">
        <button onClick={() => navigate('/overview')} className="btn-back">
          ← Voltar
        </button>
        <h1>Meu Perfil</h1>
      </header>

      <div className="profile-content">
        {/* Avatar */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-large" style={{ backgroundColor: avatarColor }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <span className="profile-role">{user.role}</span>
          </div>
        </div>

        {/* Profile Form */}
        <section className="profile-section">
          <h3>Informações</h3>
          <div className="form-group">
            <label>Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user.email} disabled />
          </div>
          <button
            onClick={handleSaveProfile}
            className="btn-primary"
            disabled={!name.trim() || name === user.name || savingProfile}
          >
            {savingProfile ? 'Salvando...' : 'Salvar'}
          </button>
        </section>

        {/* Password Form */}
        <section className="profile-section">
          <h3>Alterar Senha</h3>
          {passwordError && <p className="profile-error">{passwordError}</p>}
          <div className="form-group">
            <label>Senha atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Digite sua senha atual"
            />
          </div>
          <div className="form-group">
            <label>Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="form-group">
            <label>Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>
          <button
            onClick={handleChangePassword}
            className="btn-primary"
            disabled={savingPassword}
          >
            {savingPassword ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </section>
      </div>
    </div>
  );
}
