import React, { useState } from 'react';
import ClientForm from './components/ClientForm';
import AdminDashboard from './components/AdminDashboard';
import { Lock } from 'lucide-react';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  // Simples verificação de senha (em um app real, use Auth do Supabase)
  const handleAdminAccess = () => {
    if (isAdmin) {
        setIsAdmin(false);
        return;
    }
    
    // Para simplificar o desenvolvimento, sem senha complexa por enquanto
    // ou apenas um prompt simples
    const pass = window.prompt("Digite a senha de administrador:");
    if (pass === "admin123") { // Senha hardcoded simples para exemplo
        setIsAdmin(true);
    } else if (pass !== null) {
        alert("Senha incorreta");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow">
        {isAdmin ? (
            <AdminDashboard onLogout={() => setIsAdmin(false)} />
        ) : (
            <ClientForm />
        )}
      </main>

      {/* Footer simples com link discreto para Admin */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-500 text-sm mb-2">Neto Almudi Viagens &copy; {new Date().getFullYear()}</p>
            <button 
                onClick={handleAdminAccess}
                className="text-gray-300 hover:text-primary transition-colors text-xs flex items-center justify-center gap-1 mx-auto"
            >
                <Lock size={12} />
                {isAdmin ? 'Voltar para Área Pública' : 'Acesso Administrativo'}
            </button>
        </div>
      </footer>
    </div>
  );
};

export default App;