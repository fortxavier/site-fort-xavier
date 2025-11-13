"use client";

import React from 'react';
import Link from 'next/link';
import { Home, Building, Users, Settings, LogOut } from 'lucide-react';
import LoginForm from './LoginForm';
import './global.css';
import { AuthProvider, useAuth } from '../../lib/AuthContext';

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, login, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="text-xl font-bold">Fort Xavier Imóveis</h1>
          <p className="text-sm opacity-75">Área Administrativa</p>
          <div className="user-info">
            <p className="text-sm font-medium">Olá, {user?.name}</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <Link
                href="/admin"
                className="sidebar-link"
              >
                <Home className="sidebar-icon h-5 w-5" />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/imoveis"
                className="sidebar-link"
              >
                <Building className="sidebar-icon h-5 w-5" />
                <span>Imóveis</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/leads"
                className="sidebar-link"
              >
                <Users className="sidebar-icon h-5 w-5" />
                <span>Leads</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/configuracoes"
                className="sidebar-link"
              >
                <Settings className="sidebar-icon h-5 w-5" />
                <span>Configurações</span>
              </Link>
            </li>
            <li>
              <Link
                href="/"
                className="sidebar-link"
              >
                <Home className="sidebar-icon h-5 w-5" />
                <span>Voltar ao Site</span>
              </Link>
            </li>
            <li>
              <button
                onClick={logout}
                className="sidebar-link logout-btn"
              >
                <LogOut className="sidebar-icon h-5 w-5" />
                <span>Sair</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </AuthProvider>
  );
}
