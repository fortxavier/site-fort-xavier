import React from 'react';
import Link from 'next/link';
import { Building, Users, Settings } from 'lucide-react';
import './global.css';

export default function AdminDashboard() {
  return (
    <div className="fade-in">
      <h1 className="page-title">Painel Administrativo</h1>
      
      <div className="grid grid-cols-3 gap-6">
        <Link href="/admin/imoveis" className="block card-home">
          <div className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center-dash mb-4">
              <Building className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold">Imóveis</h2>
            </div>
            <p className="text-gray-600">Gerencie os imóveis disponíveis no site.</p>
            <div className="mt-4 text-blue-600 font-medium">Acessar →</div>
          </div>
        </Link>
        
        <Link href="/admin/leads" className="block card-home">
          <div className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center-dash mb-4">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold">Leads</h2>
            </div>
            <p className="text-gray-600">Visualize e gerencie os contatos recebidos.</p>
            <div className="mt-4 text-blue-600 font-medium">Acessar →</div>
          </div>
        </Link>
        
        <Link href="/admin/configuracoes" className="block card-home">
          <div className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center-dash mb-4">
              <Settings className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold">Configurações</h2>
            </div>
            <p className="text-gray-600">Configure as opções do sistema.</p>
            <div className="mt-4 text-blue-600 font-medium">Acessar →</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
