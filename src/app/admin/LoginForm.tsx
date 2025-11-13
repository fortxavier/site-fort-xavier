"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import './global.css';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<boolean> | boolean;
}

export default function LoginForm({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      // se quiser manter o "delay" de simulação, ok:
      await new Promise(resolve => setTimeout(resolve, 1000));

      const success = await onLogin(username, password);
      if (!success) setError('Usuário ou senha incorretos');
    } catch (err) {
      setError('Erro ao autenticar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Lock className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="login-title">Revendo Ape</h1>
          <p className="login-subtitle">Área Administrativa</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Usuário
            </label>
            <div className="input-container">
              <User className="input-icon" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="Digite seu usuário"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Senha
            </label>
            <div className="input-container">
              <Lock className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Digite sua senha"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !username || !password}
          >
            {isLoading ? (
              <div className="loading-spinner-small"></div>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="text-sm text-gray-500">
            Acesso restrito a usuários autorizados
          </p>
        </div>
      </div>
    </div>
  );
}

